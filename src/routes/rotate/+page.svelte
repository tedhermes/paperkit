<script lang="ts">
  import DropZone from '$lib/components/DropZone.svelte';
  import ToolLayout from '$lib/components/ToolLayout.svelte';
  import PageThumbnail from '$lib/components/PageThumbnail.svelte';
  import { rotatePages, downloadBlob, validateFileSize } from '$lib/pdf/process';
  import { PDFDocument } from 'pdf-lib';

  let file = $state<File | null>(null);
  let totalPages = $state(0);
  let selectedPages = $state<Set<number>>(new Set());
  let angle = $state<90 | 180 | 270>(90);
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

  function selectAll() {
    selectedPages = new Set(Array.from({ length: totalPages }, (_, i) => i + 1));
  }

  function selectNone() {
    selectedPages = new Set();
  }

  async function handleProcess() {
    if (!file || selectedPages.size === 0) return;
    processing = true;
    error = null;
    try {
      const pages = Array.from(selectedPages).sort((a, b) => a - b);
      const result = await rotatePages(file, pages, angle);
      downloadBlob(result, `rotated-${file.name}`);
    } catch {
      error = 'Failed to rotate pages. Please try again.';
    }
    processing = false;
  }

  function clearFile() { file = null; totalPages = 0; selectedPages = new Set(); error = null; }
</script>

<svelte:head>
  <title>PaperKit — Rotate Pages</title>
</svelte:head>

<ToolLayout title="Rotate Pages" description="Rotate pages 90°, 180°, or 270°.">
  {#if !file}
    <DropZone accept=".pdf" onFiles={handleFile} />
  {:else}
    <div class="file-bar">
      <span class="filename">{file.name}</span>
      <span class="page-count">{totalPages} page{totalPages !== 1 ? 's' : ''}</span>
      <button onclick={clearFile} class="btn-ghost">Remove</button>
    </div>

    <div class="pill-group">
      {#each [90, 180, 270] as a}
        <button
          class="pill"
          class:active={angle === a}
          onclick={() => angle = a as 90 | 180 | 270}
        >
          {a}°
        </button>
      {/each}
    </div>

    <div class="selection-bar">
      <p class="summary-text">{selectedPages.size} page{selectedPages.size !== 1 ? 's' : ''} selected for {angle}° rotation</p>
      <div class="selection-actions">
        <button class="btn-ghost" onclick={selectAll}>Select All</button>
        <button class="btn-ghost" onclick={selectNone}>Clear</button>
      </div>
    </div>

    <div class="thumb-grid">
      {#each Array.from({ length: totalPages }, (_, i) => i + 1) as n}
        <PageThumbnail
          {file}
          pageNum={n}
          width={130}
          selected={selectedPages.has(n)}
          onClick={() => togglePage(n)}
        />
      {/each}
    </div>

    {#if error}
      <div class="error-msg">{error}</div>
    {/if}

    <button class="btn-primary" onclick={handleProcess} disabled={processing || selectedPages.size === 0}>
      {processing ? 'Processing...' : `Rotate ${selectedPages.size} Page${selectedPages.size !== 1 ? 's' : ''} ${angle}°`}
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
    padding: 0.25rem 0.5rem;
  }
  .pill-group {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }
  .pill {
    padding: 0.5rem 1.25rem;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--surface);
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
    transition: all 0.15s;
    font-family: inherit;
  }
  .pill:hover { border-color: var(--accent); }
  .pill.active {
    background: var(--accent);
    color: white;
    border-color: var(--accent);
  }
  .selection-bar {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  .summary-text {
    font-size: 0.9rem;
    color: var(--text-secondary);
    flex: 1;
    margin: 0;
  }
  .selection-actions {
    display: flex;
    gap: 0.25rem;
  }
  .thumb-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
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
