<script lang="ts">
  import DropZone from '$lib/components/DropZone.svelte';
  import ToolLayout from '$lib/components/ToolLayout.svelte';
  import { cropPage, downloadBlob, validateFileSize } from '$lib/pdf/process';
  import { PDFDocument } from 'pdf-lib';

  let file = $state<File | null>(null);
  let totalPages = $state(0);
  let pageNum = $state(1);
  let pageWidth = $state(0);  // PDF points
  let pageHeight = $state(0);
  let scale = $state(1);      // canvas px per PDF pt
  let canvasW = $state(600);
  let canvasH = $state(800);
  let crop = $state({ x: 20, y: 20, w: 500, h: 700 });
  let dragging = $state<string | null>(null);
  let dragStart = $state({ x: 0, y: 0 });
  let dragStartCrop = $state({ x: 0, y: 0, w: 0, h: 0 });
  let processing = $state(false);
  let error = $state<string | null>(null);
  let pdfCanvas = $state<HTMLCanvasElement | null>(null);
  let overlayCanvas = $state<HTMLCanvasElement | null>(null);
  let containerEl = $state<HTMLDivElement | null>(null);
  let pageRendered = $state(false);

  const HANDLE_R = 7;
  const MIN_CROP = 10; // minimum crop dimension in canvas pixels

  async function handleFile(files: File[]) {
    error = null;
    file = files[0];
    try {
      const buf = await file.arrayBuffer();
      const doc = await PDFDocument.load(buf);
      totalPages = doc.getPageCount();
      pageNum = 1;
      const page = doc.getPage(0);
      const size = page.getSize();
      pageWidth = size.width;
      pageHeight = size.height;
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

    async function render() {
      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';

        const buf = await f.arrayBuffer();
        if (cancelled) return;

        const doc = await pdfjs.getDocument({ data: buf }).promise;
        if (cancelled) return;

        const page = await doc.getPage(pn);
        const viewport = page.getViewport({ scale: 1 });

        // Determine scale to fit container
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

        if (!cancelled) {
          pageRendered = true;
        }

        doc.destroy();
      } catch (e) {
        // silent
      }
    }

    render();
    return () => { cancelled = true; };
  });

  // ── Draw crop overlay ─────────────────────────────────────────
  $effect(() => {
    const canvas = overlayCanvas;
    if (!canvas || !pageRendered) return;

    const ctx = canvas.getContext('2d')!;
    canvas.width = canvasW;
    canvas.height = canvasH;

    ctx.clearRect(0, 0, canvasW, canvasH);

    const c = crop;

    // 1. Darken outside crop area (4 rectangles)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    // top
    ctx.fillRect(0, 0, canvasW, c.y);
    // bottom
    ctx.fillRect(0, c.y + c.h, canvasW, canvasH - c.y - c.h);
    // left
    ctx.fillRect(0, c.y, c.x, c.h);
    // right
    ctx.fillRect(c.x + c.w, c.y, canvasW - c.x - c.w, c.h);

    // 2. Crop border (dashed)
    ctx.save();
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 3]);
    ctx.strokeRect(c.x, c.y, c.w, c.h);
    ctx.restore();

    // 3. Corner handles
    const corners: [number, number, string][] = [
      [c.x, c.y, 'tl'],
      [c.x + c.w, c.y, 'tr'],
      [c.x, c.y + c.h, 'bl'],
      [c.x + c.w, c.y + c.h, 'br'],
    ];

    for (const [hx, hy] of corners) {
      // White fill with accent border
      ctx.beginPath();
      ctx.arc(hx, hy, HANDLE_R, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
  });

  // ── Get handle under pointer ──────────────────────────────────
  function hitHandle(px: number, py: number): string | null {
    const corners: [number, number, string][] = [
      [crop.x, crop.y, 'tl'],
      [crop.x + crop.w, crop.y, 'tr'],
      [crop.x, crop.y + crop.h, 'bl'],
      [crop.x + crop.w, crop.y + crop.h, 'br'],
    ];
    for (const [hx, hy, id] of corners) {
      const dx = px - hx;
      const dy = py - hy;
      if (dx * dx + dy * dy <= (HANDLE_R + 6) * (HANDLE_R + 6)) {
        return id;
      }
    }
    return null;
  }

  function handlePointerDown(e: PointerEvent) {
    if (!overlayCanvas) return;
    const rect = overlayCanvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    const handle = hitHandle(px, py);
    if (handle) {
      dragging = handle;
      dragStart = { x: px, y: py };
      dragStartCrop = { ...crop };
      overlayCanvas.setPointerCapture(e.pointerId);
      e.preventDefault();
    }
  }

  function handlePointerMove(e: PointerEvent) {
    if (!dragging || !overlayCanvas) return;
    const rect = overlayCanvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    const dx = px - dragStart.x;
    const dy = py - dragStart.y;
    const sc = dragStartCrop;

    let nx = sc.x, ny = sc.y, nw = sc.w, nh = sc.h;

    switch (dragging) {
      case 'tl':
        nx = sc.x + dx;
        ny = sc.y + dy;
        nw = sc.w - dx;
        nh = sc.h - dy;
        break;
      case 'tr':
        ny = sc.y + dy;
        nw = sc.w + dx;
        nh = sc.h - dy;
        break;
      case 'bl':
        nx = sc.x + dx;
        nw = sc.w - dx;
        nh = sc.h + dy;
        break;
      case 'br':
        nw = sc.w + dx;
        nh = sc.h + dy;
        break;
    }

    // Clamp and enforce minimum size
    if (nw < MIN_CROP) {
      if (dragging === 'tl' || dragging === 'bl') nx = sc.x + sc.w - MIN_CROP;
      nw = MIN_CROP;
    }
    if (nh < MIN_CROP) {
      if (dragging === 'tl' || dragging === 'tr') ny = sc.y + sc.h - MIN_CROP;
      nh = MIN_CROP;
    }
    nx = Math.max(0, Math.min(nx, canvasW - MIN_CROP));
    ny = Math.max(0, Math.min(ny, canvasH - MIN_CROP));
    nw = Math.min(nw, canvasW - nx);
    nh = Math.min(nh, canvasH - ny);

    crop = { x: Math.round(nx), y: Math.round(ny), w: Math.round(nw), h: Math.round(nh) };
  }

  function handlePointerUp() {
    dragging = null;
  }

  // ── Handle page change ────────────────────────────────────────
  async function handlePageSelect(n: number) {
    pageNum = n;
    // Reset crop to near-full-page on page change
    try {
      const buf = await file!.arrayBuffer();
      const doc = await PDFDocument.load(buf);
      const page = doc.getPage(n - 1);
      const size = page.getSize();
      pageWidth = size.width;
      pageHeight = size.height;
    } catch {
      // keep current
    }
  }

  // ── Process ───────────────────────────────────────────────────
  async function handleProcess() {
    if (!file) return;
    processing = true;
    error = null;
    try {
      // Convert canvas coords to PDF points
      const pdfCrop = {
        x: Math.round(crop.x / scale),
        y: Math.round(crop.y / scale),
        width: Math.round(crop.w / scale),
        height: Math.round(crop.h / scale),
      };
      const result = await cropPage(file, pageNum, pdfCrop);
      downloadBlob(result, `cropped-page${pageNum}-${file.name}`);
    } catch {
      error = 'Failed to crop the page. Please try again.';
    }
    processing = false;
  }

  function clearFile() { file = null; totalPages = 0; error = null; pageRendered = false; }

  // ── Derived PDF-point crop values for display ─────────────────
  let pdfCropDisplay = $derived({
    x: Math.round(crop.x / scale),
    y: Math.round(crop.y / scale),
    w: Math.round(crop.w / scale),
    h: Math.round(crop.h / scale),
  });
</script>

<svelte:head>
  <title>PaperKit — Crop PDF</title>
</svelte:head>

<ToolLayout title="Crop Page" description="Drag the corner handles to set a crop region on the page preview.">
  {#if !file}
    <DropZone accept=".pdf" onFiles={handleFile} />
  {:else}
    <div class="file-bar">
      <span class="filename">{file.name}</span>
      <span class="page-count">{totalPages} page{totalPages !== 1 ? 's' : ''}</span>
      <button onclick={clearFile} class="btn-ghost">Remove</button>
    </div>

    <div class="form-group">
      <label>Page to crop:</label>
      <div class="page-grid">
        {#each Array.from({ length: totalPages }, (_, i) => i + 1) as n}
          <button
            class="page-btn"
            class:selected={pageNum === n}
            onclick={() => handlePageSelect(n)}
          >
            {n}
          </button>
        {/each}
      </div>
    </div>

    <!-- Canvas area -->
    <div class="canvas-container" bind:this={containerEl}>
      <canvas
        bind:this={pdfCanvas}
        class="pdf-canvas"
        class:hidden={!pageRendered}
      ></canvas>
      <canvas
        bind:this={overlayCanvas}
        class="overlay-canvas"
        class:hidden={!pageRendered}
        onpointerdown={handlePointerDown}
        onpointermove={handlePointerMove}
        onpointerup={handlePointerUp}
        onpointercancel={handlePointerUp}
        style:cursor={dragging ? 'grabbing' : 'default'}
      ></canvas>
      {#if !pageRendered}
        <div class="canvas-loading">Rendering page…</div>
      {/if}
    </div>

    <!-- Crop dimensions -->
    <div class="crop-info">
      <span class="crop-dim">X: {pdfCropDisplay.x}</span>
      <span class="crop-dim">Y: {pdfCropDisplay.y}</span>
      <span class="crop-dim">W: {pdfCropDisplay.w}</span>
      <span class="crop-dim">H: {pdfCropDisplay.h}</span>
      <span class="crop-unit">pts</span>
    </div>

    {#if error}
      <div class="error-msg">{error}</div>
    {/if}

    <button class="btn-primary" onclick={handleProcess} disabled={processing}>
      {processing ? 'Processing…' : `Crop Page ${pageNum} & Download`}
    </button>
  {/if}
</ToolLayout>

<style>
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
  .btn-ghost {
    background: none;
    border: none;
    color: var(--accent);
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 500;
  }
  .form-group {
    margin-bottom: 1.25rem;
  }
  .form-group label {
    font-size: 0.9rem;
    font-weight: 500;
    display: block;
    margin-bottom: 0.5rem;
  }
  .page-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
  .page-btn {
    width: 44px;
    height: 44px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
    transition: all 0.15s;
  }
  .page-btn:hover { border-color: var(--accent); }
  .page-btn.selected {
    background: var(--accent);
    color: white;
    border-color: var(--accent);
  }

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
  .pdf-canvas {
    display: block;
    width: 100%;
    height: auto;
    touch-action: none;
  }
  .pdf-canvas.hidden { display: none; }
  .overlay-canvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    touch-action: none;
  }
  .overlay-canvas.hidden { display: none; }
  .canvas-loading {
    padding: 3rem 1rem;
    color: var(--text-secondary);
    font-size: 0.9rem;
  }

  .crop-info {
    display: flex;
    gap: 1rem;
    align-items: center;
    margin-bottom: 1.25rem;
    padding: 0.6rem 1rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    font-size: 0.9rem;
    font-family: monospace;
    flex-wrap: wrap;
  }
  .crop-dim {
    font-weight: 600;
    color: var(--text);
  }
  .crop-unit {
    color: var(--text-secondary);
    font-size: 0.8rem;
    font-family: inherit;
  }

  .error-msg {
    background: #fef2f2;
    color: #dc2626;
    padding: 0.75rem 1rem;
    border-radius: var(--radius);
    margin-bottom: 1rem;
    font-size: 0.9rem;
  }
</style>
