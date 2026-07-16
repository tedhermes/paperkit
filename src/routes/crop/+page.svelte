<script lang="ts">
  import DropZone from '$lib/components/DropZone.svelte';
  import ToolLayout from '$lib/components/ToolLayout.svelte';
  import { cropPage, downloadBlob, validateFileSize } from '$lib/pdf/process';
  import { PDFDocument } from 'pdf-lib';

  let file = $state<File | null>(null);
  let totalPages = $state(0);
  let pageNum = $state(1);
  let cropX = $state(0);
  let cropY = $state(0);
  let cropWidth = $state(0);
  let cropHeight = $state(0);
  let pageWidth = $state(612);
  let pageHeight = $state(792);
  let processing = $state(false);
  let error = $state<string | null>(null);

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
      cropWidth = Math.round(size.width);
      cropHeight = Math.round(size.height);
      cropX = 0;
      cropY = 0;
    } catch {
      error = 'Could not read this PDF. The file may be corrupted or password-protected.';
      file = null;
    }
  }

  async function handlePageSelect(n: number) {
    pageNum = n;
    try {
      const buf = await file!.arrayBuffer();
      const doc = await PDFDocument.load(buf);
      const page = doc.getPage(n - 1);
      const size = page.getSize();
      pageWidth = size.width;
      pageHeight = size.height;
      cropWidth = Math.round(size.width);
      cropHeight = Math.round(size.height);
      cropX = 0;
      cropY = 0;
    } catch {
      // keep current dimensions
    }
  }

  async function handleProcess() {
    if (!file) return;
    processing = true;
    error = null;
    try {
      const result = await cropPage(file, pageNum, {
        x: cropX,
        y: cropY,
        width: cropWidth,
        height: cropHeight,
      });
      downloadBlob(result, `cropped-page${pageNum}-${file.name}`);
    } catch {
      error = 'Failed to crop the page. Please try again.';
    }
    processing = false;
  }

  function clearFile() { file = null; totalPages = 0; error = null; }
</script>

<svelte:head>
  <title>PaperKit — Crop PDF</title>
</svelte:head>

<ToolLayout title="Crop Page" description="Trim page margins by setting a crop region.">
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

    <div class="crop-inputs">
      <div class="input-row">
        <label>X: <input type="number" bind:value={cropX} min="0" max={pageWidth} /></label>
        <label>Y: <input type="number" bind:value={cropY} min="0" max={pageHeight} /></label>
      </div>
      <div class="input-row">
        <label>Width: <input type="number" bind:value={cropWidth} min="1" max={pageWidth} /></label>
        <label>Height: <input type="number" bind:value={cropHeight} min="1" max={pageHeight} /></label>
      </div>
      <p class="dimension-hint">Page size: {pageWidth} × {pageHeight} pts</p>
    </div>

    {#if error}
      <div class="error-msg">{error}</div>
    {/if}

    <button class="btn-primary" onclick={handleProcess} disabled={processing}>
      {processing ? 'Processing...' : `Crop Page ${pageNum}`}
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
    margin-bottom: 1.5rem;
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
  .crop-inputs {
    margin-bottom: 1.5rem;
  }
  .input-row {
    display: flex;
    gap: 1rem;
    margin-bottom: 0.75rem;
  }
  .input-row label {
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex: 1;
  }
  .input-row input {
    width: 100px;
    padding: 0.4rem 0.5rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    font-size: 0.9rem;
  }
  .dimension-hint {
    font-size: 0.8rem;
    color: var(--text-secondary);
    margin-top: 0.25rem;
  }
  .error-msg {
    background: #fef2f2;
    color: #dc2626;
    padding: 0.75rem 1rem;
    border-radius: var(--radius);
    margin-bottom: 1rem;
    font-size: 0.9rem;
  }

  @media (max-width: 640px) {
    .input-row { flex-direction: column; }
  }
</style>
