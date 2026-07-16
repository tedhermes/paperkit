<script lang="ts">
  import DropZone from '$lib/components/DropZone.svelte';
  import ToolLayout from '$lib/components/ToolLayout.svelte';
  import { extractPages, downloadBlob, validateFileSize } from '$lib/pdf/process';
  import { PDFDocument } from 'pdf-lib';

  let file = $state<File | null>(null);
  let totalPages = $state(0);
  let selectedPages = $state<Set<number>>(new Set());
  let processing = $state(false);
  let error = $state<string | null>(null);

  async function handleFile(files: File[]) {
    error = null;
    file = files[0];
    try {
      const buf = await file.arrayBuffer();
      const doc = await PDFDocument.load(buf);
      totalPages = doc.getPageCount();
      selectedPages = new Set();
    } catch {
      error = 'Could not read this PDF. The file may be corrupted or password-protected.';
      file = null;
    }
  }

  function togglePage(n: number) {
    const next = new Set(selectedPages);
    if (next.has(n)) next.delete(n); else next.add(n);
    selectedPages = next;
  }

  async function handleProcess() {
    if (!file || selectedPages.size === 0) return;
    processing = true;
    error = null;
    try {
      const pagesToExtract = Array.from(selectedPages).sort((a, b) => a - b);
      const result = await extractPages(file, pagesToExtract);
      downloadBlob(result, `extracted-${file.name}`);
    } catch {
      error = 'Failed to extract pages. Please try again.';
    }
    processing = false;
  }

  function clearFile() { file = null; totalPages = 0; selectedPages = new Set(); error = null; }
</script>

<svelte:head>
  <title>PaperKit — Extract Pages</title>
</svelte:head>

<ToolLayout title="Extract Pages" description="Pull out selected pages into a new PDF.">
  {#if !file}
    <DropZone accept=".pdf" onFiles={handleFile} />
  {:else}
    <div class="file-bar">
      <span class="filename">{file.name}</span>
      <span class="page-count">{totalPages} page{totalPages !== 1 ? 's' : ''}</span>
      <button onclick={clearFile} class="btn-ghost">Remove</button>
    </div>

    <p class="select-hint">Select pages to extract into a new PDF. {selectedPages.size} page{selectedPages.size !== 1 ? 's' : ''} selected.</p>

    <div class="page-grid">
      {#each Array.from({ length: totalPages }, (_, i) => i + 1) as n}
        <button
          class="page-btn"
          class:selected={selectedPages.has(n)}
          onclick={() => togglePage(n)}
        >
          {n}
        </button>
      {/each}
    </div>

    {#if error}
      <div class="error-msg">{error}</div>
    {/if}

    <button class="btn-primary" onclick={handleProcess} disabled={processing || selectedPages.size === 0}>
      {processing ? 'Processing...' : `Extract ${selectedPages.size} Page${selectedPages.size !== 1 ? 's' : ''}`}
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
  .select-hint {
    font-size: 0.9rem;
    color: var(--text-secondary);
    margin-bottom: 1rem;
  }
  .page-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
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
  .error-msg {
    background: #fef2f2;
    color: #dc2626;
    padding: 0.75rem 1rem;
    border-radius: var(--radius);
    margin-bottom: 1rem;
    font-size: 0.9rem;
  }
</style>
