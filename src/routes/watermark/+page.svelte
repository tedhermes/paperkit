<script lang="ts">
  import DropZone from '$lib/components/DropZone.svelte';
  import ToolLayout from '$lib/components/ToolLayout.svelte';
  import { addWatermark, downloadBlob, validateFileSize } from '$lib/pdf/process';
  import { PDFDocument } from 'pdf-lib';

  let file = $state<File | null>(null);
  let totalPages = $state(0);
  let watermarkText = $state('CONFIDENTIAL');
  let opacity = $state(0.15);
  let fontSize = $state(48);
  let rotation = $state(-45);
  let processing = $state(false);
  let error = $state<string | null>(null);
  let previewCanvas = $state<HTMLCanvasElement | null>(null);
  let previewTimer: ReturnType<typeof setTimeout> | undefined;

  async function handleFile(files: File[]) {
    error = null;
    file = files[0];
    try {
      const buf = await file.arrayBuffer();
      const doc = await PDFDocument.load(buf);
      totalPages = doc.getPageCount();
    } catch {
      error = "This doesn't look like a PDF file. Please upload a .pdf file.";
      file = null;
    }
  }

  async function renderPreview() {
    if (!file || !previewCanvas) return;
    const canvas = previewCanvas;
    const MAX_WIDTH = 400;

    try {
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';

      const buf = await file.arrayBuffer();
      const doc = await pdfjs.getDocument({ data: buf }).promise;
      const page = await doc.getPage(1);
      const viewport = page.getViewport({ scale: 1 });
      const scale = MAX_WIDTH / viewport.width;
      const scaled = page.getViewport({ scale });

      canvas.width = scaled.width;
      canvas.height = scaled.height;

      const ctx = canvas.getContext('2d')!;
      await page.render({ canvasContext: ctx, viewport: scaled }).promise;

      // Draw watermark overlay scaled to preview size
      const previewFontSize = Math.round(fontSize * scale);
      drawWatermarkPreview(ctx, canvas.width, canvas.height, watermarkText, opacity, previewFontSize, rotation, '#000000');

      doc.destroy();
    } catch {
      // Preview failed silently — still show rendered page without watermark
    }
  }

  function drawWatermarkPreview(
    ctx: CanvasRenderingContext2D,
    w: number, h: number, text: string, op: number, size: number, rot: number, color: string
  ) {
    if (!text.trim()) return;
    ctx.save();
    ctx.globalAlpha = op;
    ctx.font = `bold ${size}px Helvetica`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const radians = (rot * Math.PI) / 180;
    const textWidth = ctx.measureText(text).width;
    const textHeight = size;
    const stepX = textWidth * 2.5;
    const stepY = textHeight * 3;

    ctx.translate(w / 2, h / 2);
    ctx.rotate(radians);

    for (let y = -h; y < h + textHeight; y += stepY) {
      for (let x = -w; x < w + textWidth; x += stepX) {
        ctx.fillText(text, x, y);
      }
    }

    ctx.restore();
  }

  // Debounced preview: re-render when settings change
  $effect(() => {
    watermarkText; opacity; fontSize; rotation;
    if (!file || !previewCanvas) return;
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => { renderPreview(); }, 300);
    return () => { clearTimeout(previewTimer); };
  });

  // Also render when canvas first becomes available
  $effect(() => {
    if (previewCanvas && file) {
      renderPreview();
    }
  });

  async function handleProcess() {
    if (!file || !watermarkText.trim()) return;
    processing = true;
    error = null;
    try {
      const result = await addWatermark(file, {
        text: watermarkText,
        opacity,
        fontSize,
        rotation,
      });
      downloadBlob(result, `watermarked-${file.name}`);
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes('Invalid PDF') || msg.includes('header')) {
        error = "This doesn't look like a PDF file. Please upload a .pdf file.";
      } else if (msg.includes('password')) {
        error = 'This PDF is password-protected. Unlock it first.';
      } else {
        error = 'Something went wrong. Try a different file.';
      }
    }
    processing = false;
  }

  function clearFile() { file = null; error = null; totalPages = 0; }
</script>

<svelte:head>
  <title>PaperKit — Watermark PDF</title>
</svelte:head>

<ToolLayout title="Watermark" description="Add text watermarks with custom opacity.">
  {#if !file}
    <div class="empty-state">
      <span class="empty-icon">💧</span>
      <h3>Ready to watermark</h3>
      <p>Drop your PDF here to add custom watermarks.</p>
    </div>
    <DropZone accept=".pdf" onFiles={handleFile} />
  {:else}
    <div class="file-bar">
      <span class="file-icon">📄</span>
      <div class="file-info">
        <span class="filename">{file.name}</span>
        <span class="file-meta">{totalPages} page{totalPages !== 1 ? 's' : ''} &middot; {(file.size / 1024).toFixed(0)} KB</span>
      </div>
      <button onclick={clearFile} class="btn-ghost">Change file</button>
    </div>

    <div class="form-group">
      <label for="wm-text">Watermark text</label>
      <input id="wm-text" type="text" bind:value={watermarkText} class="text-input" placeholder="e.g. CONFIDENTIAL" />
    </div>

    <div class="form-group">
      <label for="wm-opacity">Opacity: {opacity.toFixed(2)}</label>
      <input id="wm-opacity" type="range" bind:value={opacity} min="0" max="1" step="0.01" class="slider" />
    </div>

    <div class="form-row">
      <div class="form-group">
        <label for="wm-size">Font size</label>
        <input id="wm-size" type="number" bind:value={fontSize} min="8" max="200" class="num-input" />
      </div>
      <div class="form-group">
        <label for="wm-rotation">Rotation (°)</label>
        <input id="wm-rotation" type="number" bind:value={rotation} min="-360" max="360" class="num-input" />
      </div>
    </div>

    <div class="preview-wrap">
      <span class="preview-label">Preview &mdash; first page with watermark</span>
      <canvas bind:this={previewCanvas}></canvas>
    </div>

    {#if error}
      <div class="error-msg">{error}</div>
    {/if}

    <button class="btn-primary" onclick={handleProcess} disabled={processing || !watermarkText.trim()}>
      {#if processing}
        <span class="spinner"></span> Processing...
      {:else}
        Add Watermark &amp; Download
      {/if}
    </button>
  {/if}
</ToolLayout>
