<script lang="ts">
  import DropZone from '$lib/components/DropZone.svelte';
  import ToolLayout from '$lib/components/ToolLayout.svelte';
  import { redactPDF, downloadBlob, validateFileSize } from '$lib/pdf/process';
  import type { RedactionRect } from '$lib/pdf/process';
  import { PDFDocument } from 'pdf-lib';
  import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

  let file = $state<File | null>(null);
  let totalPages = $state(0);
  let pageNum = $state(1);
  let pageWidth = $state(612);
  let pageHeight = $state(792);
  let scale = $state(1);
  let canvasW = $state(600);
  let canvasH = $state(800);
  let rects = $state<RedactionRect[]>([]);
  let processing = $state(false);
  let error = $state<string | null>(null);
  let pdfCanvas = $state<HTMLCanvasElement | null>(null);
  let overlayCanvas = $state<HTMLCanvasElement | null>(null);
  let containerEl = $state<HTMLDivElement | null>(null);
  let pageRendered = $state(false);

  const REDACT_W = 80;  // default redaction rect width in PDF points
  const REDACT_H = 18;  // default redaction rect height in PDF points

  async function handleFile(files: File[]) {
    error = null;
    const f = files[0];
    const sizeErr = validateFileSize(f);
    if (sizeErr) { error = sizeErr; return; }
    file = f;
    try {
      const buf = await f.arrayBuffer();
      const doc = await PDFDocument.load(buf);
      totalPages = doc.getPageCount();
      pageNum = 1;
      const page = doc.getPage(0);
      const size = page.getSize();
      pageWidth = size.width;
      pageHeight = size.height;
      rects = [];
    } catch {
      error = 'Could not read this PDF. The file may be corrupted or password-protected.';
      file = null;
    }
  }

  // ── Render PDF page to bottom canvas ──────────────────────────
  $effect(() => {
    const pn = pageNum;
    const f = file;
    const canvas = pdfCanvas;
    if (!canvas || !f) return;

    let cancelled = false;
    pageRendered = false;
    rects = [];

    async function render() {
      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
        const buf = await f.arrayBuffer();
        if (cancelled) return;
        const doc = await pdfjs.getDocument({ data: buf }).promise;
        if (cancelled) return;
        const page = await doc.getPage(pn);
        const viewport = page.getViewport({ scale: 1 });

        const containerWidth = containerEl?.clientWidth ?? 600;
        const fitScale = Math.min(containerWidth / viewport.width, 1200 / viewport.width);
        const scaled = page.getViewport({ scale: fitScale });

        scale = fitScale;
        canvasW = scaled.width;
        canvasH = scaled.height;

        canvas.width = scaled.width;
        canvas.height = scaled.height;

        const ctx = canvas.getContext('2d')!;
        await page.render({ canvasContext: ctx, viewport: scaled }).promise;

        if (!cancelled) pageRendered = true;
        doc.destroy();
      } catch { /* silent */ }
    }

    render();
    return () => { cancelled = true; };
  });

  // ── Draw redaction overlay ────────────────────────────────────
  $effect(() => {
    const canvas = overlayCanvas;
    if (!canvas || !pageRendered) return;

    const ctx = canvas.getContext('2d')!;
    canvas.width = canvasW;
    canvas.height = canvasH;
    ctx.clearRect(0, 0, canvasW, canvasH);

    if (rects.length === 0) {
      ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Click on the page to place a redaction box', canvasW / 2, canvasH / 2);
      return;
    }

    for (const r of rects) {
      const rx = r.x * scale;
      const ry = r.y * scale;
      const rw = r.width * scale;
      const rh = r.height * scale;

      // Black fill with slight transparency so user can see what's covered
      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.fillRect(rx, ry, rw, rh);

      // Border
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2;
      ctx.strokeRect(rx, ry, rw, rh);

      // Small ✕ to indicate removable
      ctx.fillStyle = '#dc2626';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✕', rx + rw / 2, ry + rh / 2);
    }
  });

  // ── Click handler: add / remove redactions ────────────────────
  function handleCanvasClick(e: MouseEvent) {
    if (!overlayCanvas || !pageRendered) return;
    const rect = overlayCanvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const scaleX = canvasW / rect.width;
    const scaleY = canvasH / rect.height;
    const cx = Math.round(px * scaleX);
    const cy = Math.round(py * scaleY);

    // Check if click hits an existing redaction (to remove it)
    for (let i = rects.length - 1; i >= 0; i--) {
      const r = rects[i];
      const rx = r.x * scale;
      const ry = r.y * scale;
      const rw = Math.max(r.width * scale, 8);
      const rh = Math.max(r.height * scale, 8);
      if (cx >= rx && cx <= rx + rw && cy >= ry && cy <= ry + rh) {
        rects = rects.filter((_, j) => j !== i);
        return;
      }
    }

    // Add new redaction centred at click position
    const pdfX = cx / scale - REDACT_W / 2;
    const pdfY = cy / scale - REDACT_H / 2;
    rects = [...rects, { x: Math.round(pdfX), y: Math.round(pdfY), width: REDACT_W, height: REDACT_H }];
  }

  // ── Process ───────────────────────────────────────────────────
  async function handleProcess() {
    if (!file || rects.length === 0) return;
    processing = true;
    error = null;
    try {
      // Apply to all pages by default, or current page
      const allPages = Array.from({ length: totalPages }, (_, i) => i + 1);
      const result = await redactPDF(file, allPages, rects);
      downloadBlob(result, `redacted-${file.name}`);
    } catch {
      error = 'Failed to redact PDF. Please try again.';
    }
    processing = false;
  }

  function clearFile() { file = null; totalPages = 0; error = null; pageRendered = false; rects = []; }
</script>

<svelte:head>
  <title>PaperKit — Redact</title>
</svelte:head>

<ToolLayout title="Redact" description="Draw black rectangles over sensitive content. Click to place a redaction box, click it again to remove.">
  {#if !file}
    <div class="empty-state">
      <span class="empty-icon">⬛</span>
      <h3>Ready to redact</h3>
      <p>Drop your PDF here to black out sensitive information.</p>
    </div>
    <DropZone accept=".pdf" onFiles={handleFile} />
  {:else}
    <div class="file-bar">
      <span class="filename">{file.name}</span>
      <span class="page-count">{totalPages} page{totalPages !== 1 ? 's' : ''}</span>
      <button onclick={clearFile} class="btn-ghost">Remove</button>
    </div>

    <fieldset class="form-group">
      <legend>Preview page:</legend>
      <div class="page-grid">
        {#each Array.from({ length: totalPages }, (_, i) => i + 1) as n}
          <button
            class="page-btn"
            class:selected={pageNum === n}
            onclick={() => pageNum = n}
          >
            {n}
          </button>
        {/each}
      </div>
    </fieldset>

    <!-- Canvas area -->
    <div class="canvas-container" bind:this={containerEl}>
      <canvas
        bind:this={pdfCanvas}
        class="pdf-canvas"
        class:hidden={!pageRendered}
      ></canvas>
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <canvas
        bind:this={overlayCanvas}
        class="overlay-canvas"
        class:hidden={!pageRendered}
        onclick={handleCanvasClick}
        style:cursor={pageRendered ? 'crosshair' : 'default'}
      ></canvas>
      {#if !pageRendered}
        <div class="canvas-loading">Rendering page…</div>
      {/if}
    </div>

    <!-- Redaction summary -->
    {#if rects.length > 0}
      <div class="rect-summary">
        <span>{rects.length} redaction{rects.length !== 1 ? 's' : ''} placed</span>
        <span class="rect-hint">— applies to all {totalPages} pages</span>
        <button onclick={() => rects = []} class="btn-ghost">Clear all</button>
        {#each rects as r, i}
          <span class="rect-label">#{i + 1}: ({r.x}, {r.y}) {r.width}×{r.height} pts</span>
        {/each}
      </div>
    {/if}

    {#if error}
      <div class="error-msg">{error}</div>
    {/if}

    <button
      class="btn-primary"
      onclick={handleProcess}
      disabled={processing || rects.length === 0}
    >
      {#if processing}
        <span class="spinner"></span> Processing…
      {:else if rects.length === 0}
        Click on the page to place redactions
      {:else}
        Redact &amp; Download
      {/if}
    </button>

    <p class="disclaimer">
      Redactions apply to <strong>all pages</strong> at the same coordinates. Use page preview to check positioning.
    </p>
  {/if}
</ToolLayout>

<style>
  .empty-state {
    text-align: center;
    padding: 2rem 0 1.5rem;
  }
  .empty-icon { font-size: 2.5rem; display: block; margin-bottom: 0.75rem; }
  .empty-state h3 { font-size: 1.15rem; margin-bottom: 0.4rem; }
  .empty-state p { color: var(--text-secondary); font-size: 0.9rem; }

  .file-bar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 0.75rem 1rem;
    margin-bottom: 1.5rem;
  }
  .filename { font-weight: 600; font-size: 0.9rem; flex: 1; }
  .page-count { color: var(--text-secondary); font-size: 0.85rem; }

  .form-group { margin-bottom: 1.25rem; }
  .form-group legend { font-size: 0.9rem; font-weight: 500; margin-bottom: 0.4rem; }

  .page-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
  .page-btn {
    width: 44px; height: 44px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
    transition: all 0.15s;
    font-family: inherit;
  }
  .page-btn:hover { border-color: var(--accent); }
  .page-btn.selected { background: var(--accent); color: white; border-color: var(--accent); }

  .canvas-container {
    position: relative;
    margin-bottom: 1rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    background: #f8f8f8;
    min-height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .pdf-canvas { display: block; width: 100%; height: auto; }
  .pdf-canvas.hidden { display: none; }
  .overlay-canvas {
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
  }
  .overlay-canvas.hidden { display: none; }
  .canvas-loading {
    padding: 3rem 1rem;
    color: var(--text-secondary);
    font-size: 0.9rem;
  }

  .rect-summary {
    margin-bottom: 1rem;
    padding: 0.75rem 1rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
  }
  .rect-summary span:first-child { font-weight: 600; }
  .rect-hint { color: var(--text-secondary); font-size: 0.8rem; }
  .rect-label {
    width: 100%;
    font-family: monospace;
    color: var(--text-secondary);
    font-size: 0.78rem;
    padding-left: 0.25rem;
    border-left: 3px solid #dc2626;
  }

  .btn-ghost {
    background: none; border: none;
    color: var(--accent); cursor: pointer;
    font-size: 0.85rem; font-weight: 500;
    font-family: inherit;
  }

  .btn-primary {
    width: 100%; padding: 0.75rem;
    background: var(--accent); color: white;
    border: none; border-radius: 8px;
    font-size: 1rem; font-weight: 600;
    cursor: pointer; font-family: inherit;
    display: flex; align-items: center; justify-content: center; gap: 0.5rem;
    transition: opacity 0.15s;
  }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-primary:not(:disabled):hover { opacity: 0.9; }

  .error-msg {
    padding: 0.75rem 1rem;
    background: #fef2f2; border: 1px solid #fecaca;
    color: #dc2626; border-radius: 6px;
    font-size: 0.85rem; margin-bottom: 1rem;
  }

  .spinner {
    display: inline-block; width: 16px; height: 16px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: white; border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .disclaimer {
    margin-top: 1rem;
    font-size: 0.8rem;
    color: var(--text-secondary);
    text-align: center;
  }

  @media (max-width: 640px) {
    .file-bar { flex-wrap: wrap; gap: 0.5rem; }
    .rect-summary { flex-direction: column; align-items: flex-start; }
  }
</style>
