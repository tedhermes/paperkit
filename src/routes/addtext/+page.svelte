<script lang="ts">
  import DropZone from '$lib/components/DropZone.svelte';
  import ToolLayout from '$lib/components/ToolLayout.svelte';
  import { addTextToPage, downloadBlob, validateFileSize } from '$lib/pdf/process';
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
  let text = $state('');
  let textX = $state<number | null>(null);
  let textY = $state<number | null>(null);
  let fontSize = $state(14);
  let fontFamily = $state<'helvetica' | 'helvetica-bold' | 'times' | 'courier'>('helvetica');
  let hexColor = $state('#000000');
  let processing = $state(false);
  let error = $state<string | null>(null);
  let pdfCanvas = $state<HTMLCanvasElement | null>(null);
  let overlayCanvas = $state<HTMLCanvasElement | null>(null);
  let containerEl = $state<HTMLDivElement | null>(null);
  let pageRendered = $state(false);

  const FONT_MAP: Record<string, string> = {
    helvetica: 'Helvetica, Arial, sans-serif',
    'helvetica-bold': 'Helvetica, Arial, sans-serif',
    times: 'Times New Roman, serif',
    courier: 'Courier New, monospace',
  };

  const FONT_WEIGHT_MAP: Record<string, string> = {
    helvetica: 'normal',
    'helvetica-bold': 'bold',
    times: 'normal',
    courier: 'normal',
  };

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
    // Reset position on page change
    textX = null;
    textY = null;

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
      } catch {
        // silent
      }
    }

    render();
    return () => { cancelled = true; };
  });

  // ── Draw text overlay ─────────────────────────────────────────
  let blinkVisible = $state(true);
  let blinkTimer: ReturnType<typeof setInterval> | undefined;

  $effect(() => {
    const canvas = overlayCanvas;
    if (!canvas || !pageRendered) return;

    const ctx = canvas.getContext('2d')!;
    canvas.width = canvasW;
    canvas.height = canvasH;

    ctx.clearRect(0, 0, canvasW, canvasH);

    const tx = textX;
    const ty = textY;

    if (tx === null || ty === null) {
      // Show hint if no position selected
      ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Click on the page to place text', canvasW / 2, canvasH / 2);
      return;
    }

    // Draw the placed text
    if (text) {
      const canvasFontSize = Math.round(fontSize * scale);
      ctx.font = `${FONT_WEIGHT_MAP[fontFamily]} ${canvasFontSize}px ${FONT_MAP[fontFamily]}`;
      ctx.fillStyle = hexColor;
      ctx.textBaseline = 'top';
      ctx.fillText(text, tx, ty);
    }

    // Draw cursor indicator (blinking)
    if (blinkVisible) {
      ctx.beginPath();
      ctx.moveTo(tx - 4, ty);
      ctx.lineTo(tx - 4, ty + Math.round(16 * scale));
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Small dot at position
      ctx.beginPath();
      ctx.arc(tx, ty, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#6366f1';
      ctx.fill();
    }
  });

  // ── Blink timer ───────────────────────────────────────────────
  $effect(() => {
    if (!pageRendered || textX === null) {
      if (blinkTimer) clearInterval(blinkTimer);
      blinkTimer = undefined;
      return;
    }

    blinkTimer = setInterval(() => {
      blinkVisible = !blinkVisible;
    }, 530);

    return () => {
      if (blinkTimer) clearInterval(blinkTimer);
    };
  });

  // ── Click to place text ───────────────────────────────────────
  function handleCanvasClick(e: MouseEvent) {
    if (!overlayCanvas || !pageRendered) return;
    const rect = overlayCanvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const scaleX = canvasW / rect.width;
    const scaleY = canvasH / rect.height;
    textX = Math.round(px * scaleX);
    textY = Math.round(py * scaleY);
    blinkVisible = true;
  }

  // ── PDF point coords for display ──────────────────────────────
  let pdfPos = $derived(
    textX !== null && textY !== null
      ? {
          x: Math.round(textX / scale),
          y: Math.round(textY / scale),
        }
      : null
  );

  // ── Process ───────────────────────────────────────────────────
  function hexToRgb(hex: string): [number, number, number] {
    const h = hex.replace('#', '');
    return [
      parseInt(h.substring(0, 2), 16) / 255,
      parseInt(h.substring(2, 4), 16) / 255,
      parseInt(h.substring(4, 6), 16) / 255,
    ];
  }

  async function handleProcess() {
    if (!file || !text.trim() || textX === null || textY === null) return;
    processing = true;
    error = null;
    try {
      const color = hexToRgb(hexColor);
      const result = await addTextToPage(file, pageNum, text, {
        x: Math.round(textX / scale),
        y: Math.round(textY / scale),
        fontSize,
        fontFamily,
        color,
      });
      downloadBlob(result, `text-${file.name}`);
    } catch {
      error = 'Failed to add text. Please try again.';
    }
    processing = false;
  }

  function clearFile() { file = null; totalPages = 0; error = null; pageRendered = false; textX = null; textY = null; }
</script>

<svelte:head>
  <title>PaperKit — Add Text</title>
</svelte:head>

<ToolLayout title="Add Text" description="Click anywhere on the page preview to place text, then type your content below.">
  {#if !file}
    <DropZone accept=".pdf" onFiles={handleFile} />
  {:else}
    <div class="file-bar">
      <span class="filename">{file.name}</span>
      <span class="page-count">{totalPages} page{totalPages !== 1 ? 's' : ''}</span>
      <button onclick={clearFile} class="btn-ghost">Remove</button>
    </div>

    <div class="form-group">
      <label>Page to add text to:</label>
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
    </div>

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

    <!-- Position indicator -->
    {#if pdfPos}
      <div class="pos-info">Position: X: {pdfPos.x}  Y: {pdfPos.y} pts</div>
    {/if}

    <!-- Text input -->
    <div class="form-group">
      <label for="at-text">Text to add</label>
      <input
        id="at-text"
        type="text"
        bind:value={text}
        class="text-input"
        placeholder="Type your text here…"
      />
    </div>

    <!-- Controls row -->
    <div class="controls-row">
      <div class="control-group">
        <label for="at-font">Font</label>
        <select id="at-font" bind:value={fontFamily} class="select-input">
          <option value="helvetica">Helvetica</option>
          <option value="helvetica-bold">Helvetica Bold</option>
          <option value="times">Times Roman</option>
          <option value="courier">Courier</option>
        </select>
      </div>
      <div class="control-group">
        <label for="at-size">Size</label>
        <input id="at-size" type="number" bind:value={fontSize} min="6" max="200" class="num-input" />
      </div>
      <div class="control-group color-group">
        <label for="at-color">Color</label>
        <div class="color-wrap">
          <input id="at-color" type="color" bind:value={hexColor} class="color-input" />
          <input type="text" bind:value={hexColor} class="hex-input" placeholder="#000000" />
        </div>
      </div>
    </div>

    {#if error}
      <div class="error-msg">{error}</div>
    {/if}

    <button
      class="btn-primary"
      onclick={handleProcess}
      disabled={processing || !text.trim() || textX === null}
    >
      {processing
        ? 'Processing…'
        : textX === null
          ? 'Click on the page first'
          : 'Add Text & Download'}
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
    margin-bottom: 0.4rem;
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
  }
  .pdf-canvas.hidden { display: none; }
  .overlay-canvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
  .overlay-canvas.hidden { display: none; }
  .canvas-loading {
    padding: 3rem 1rem;
    color: var(--text-secondary);
    font-size: 0.9rem;
  }

  .pos-info {
    margin-bottom: 1rem;
    padding: 0.5rem 1rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    font-size: 0.85rem;
    font-family: monospace;
    color: var(--text-secondary);
  }

  .text-input {
    width: 100%;
    padding: 0.6rem 0.75rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    font-size: 0.95rem;
    box-sizing: border-box;
  }
  .controls-row {
    display: flex;
    gap: 1rem;
    margin-bottom: 1.25rem;
    flex-wrap: wrap;
  }
  .control-group {
    flex: 1;
    min-width: 100px;
  }
  .control-group label {
    font-size: 0.8rem;
    font-weight: 500;
    display: block;
    margin-bottom: 0.35rem;
    color: var(--text-secondary);
  }
  .color-group {
    min-width: 160px;
    flex: 1.5;
  }
  .select-input {
    width: 100%;
    padding: 0.5rem 0.6rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    font-size: 0.9rem;
    background: var(--surface);
    box-sizing: border-box;
  }
  .num-input {
    width: 100%;
    padding: 0.5rem 0.6rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    font-size: 0.9rem;
    box-sizing: border-box;
  }
  .color-wrap {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .color-input {
    width: 40px;
    height: 36px;
    border: 1px solid var(--border);
    border-radius: 8px;
    cursor: pointer;
    padding: 2px;
    flex-shrink: 0;
  }
  .hex-input {
    flex: 1;
    padding: 0.5rem 0.6rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    font-size: 0.85rem;
    font-family: monospace;
    min-width: 80px;
  }

  .error-msg {
    background: #fef2f2;
    color: #dc2626;
    padding: 0.75rem 1rem;
    border-radius: var(--radius);
    margin-bottom: 1rem;
    font-size: 0.9rem;
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 640px) {
    .controls-row { flex-direction: column; }
    .color-group { min-width: unset; }
  }
</style>
