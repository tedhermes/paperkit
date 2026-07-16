<script lang="ts">
  import DropZone from '$lib/components/DropZone.svelte';
  import ToolLayout from '$lib/components/ToolLayout.svelte';
  import { addPageNumbers, downloadBlob, validateFileSize } from '$lib/pdf/process';
  import { PDFDocument } from 'pdf-lib';
  import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

  let file = $state<File | null>(null);
  let totalPages = $state(0);
  let format = $state('{page} / {total}');
  let position = $state<'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-center'>('bottom-center');
  let startAt = $state(1);
  let fontSize = $state(12);
  let margin = $state(40);
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
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

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

      // Draw page number overlay
      const label = format
        .replace('{page}', String(startAt))
        .replace('{total}', String(totalPages || '?'));

      const previewFontSize = Math.max(8, Math.round(fontSize * scale));
      const previewMargin = Math.round(margin * scale);

      ctx.font = `${previewFontSize}px Helvetica`;
      ctx.fillStyle = '#666';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const textWidth = ctx.measureText(label).width;
      let x: number;
      const cw = canvas.width;

      if (position === 'bottom-center' || position === 'top-center') {
        x = cw / 2;
        ctx.textAlign = 'center';
      } else if (position === 'bottom-right') {
        x = cw - previewMargin - textWidth / 2;
        ctx.textAlign = 'center';
      } else {
        x = previewMargin + textWidth / 2;
        ctx.textAlign = 'center';
      }

      const y = position.startsWith('top')
        ? previewMargin + previewFontSize / 2
        : canvas.height - previewMargin - previewFontSize / 2;

      ctx.fillText(label, x, y);

      doc.destroy();
    } catch {
      // Preview failed silently
    }
  }

  // Debounced preview
  $effect(() => {
    format; position; startAt; fontSize; margin;
    if (!file || !previewCanvas) return;
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => { renderPreview(); }, 300);
    return () => { clearTimeout(previewTimer); };
  });

  // Render when canvas first becomes available
  $effect(() => {
    if (previewCanvas && file) {
      renderPreview();
    }
  });

  async function handleProcess() {
    if (!file) return;
    processing = true;
    error = null;
    try {
      const result = await addPageNumbers(file, {
        format,
        position,
        startAt,
        fontSize,
        margin,
      });
      downloadBlob(result, `numbered-${file.name}`);
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
  <title>PaperKit — Page Numbers</title>
</svelte:head>

<ToolLayout title="Page Numbers" description="Add page numbers with custom position and format.">
  {#if !file}
    <div class="empty-state">
      <span class="empty-icon">🔢</span>
      <h3>Ready to number pages</h3>
      <p>Drop your PDF here to add page numbers.</p>
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
      <label for="pn-format">Format (use {'{page}'} and {'{total}'})</label>
      <input id="pn-format" type="text" bind:value={format} class="text-input" placeholder="e.g. {page} / {total}" />
    </div>

    <div class="form-group">
      <label>Position</label>
      <div class="position-options">
        {#each ['bottom-center', 'bottom-right', 'bottom-left', 'top-center'] as pos}
          <button
            class="pos-btn"
            class:selected={position === pos}
            onclick={() => position = pos as typeof position}
          >
            {pos.replace('-', ' ')}
          </button>
        {/each}
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label for="pn-start">Start at</label>
        <input id="pn-start" type="number" bind:value={startAt} min="1" max="9999" class="num-input" />
      </div>
      <div class="form-group">
        <label for="pn-size">Font size</label>
        <input id="pn-size" type="number" bind:value={fontSize} min="6" max="72" class="num-input" />
      </div>
      <div class="form-group">
        <label for="pn-margin">Margin (pts)</label>
        <input id="pn-margin" type="number" bind:value={margin} min="0" max="200" class="num-input" />
      </div>
    </div>

    <div class="preview-wrap">
      <span class="preview-label">Preview &mdash; first page with page number</span>
      <canvas bind:this={previewCanvas}></canvas>
    </div>

    {#if error}
      <div class="error-msg">{error}</div>
    {/if}

    <button class="btn-primary" onclick={handleProcess} disabled={processing}>
      {#if processing}
        <span class="spinner"></span> Processing...
      {:else}
        Add Page Numbers &amp; Download
      {/if}
    </button>
  {/if}
</ToolLayout>

<style>
  .position-options {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .pos-btn {
    padding: 0.5rem 1rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 500;
    transition: all 0.15s;
    text-transform: capitalize;
  }
  .pos-btn:hover { border-color: var(--accent); }
  .pos-btn.selected {
    background: var(--accent);
    color: white;
    border-color: var(--accent);
  }
</style>
