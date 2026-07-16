<script lang="ts">
  import DropZone from '$lib/components/DropZone.svelte';
  import ToolLayout from '$lib/components/ToolLayout.svelte';
  import { reorderPages, downloadBlob, validateFileSize } from '$lib/pdf/process';
  import { PDFDocument } from 'pdf-lib';

  let file = $state<File | null>(null);
  let totalPages = $state(0);
  let pageOrder = $state<number[]>([]);
  let processing = $state(false);
  let error = $state<string | null>(null);

  async function handleFile(files: File[]) {
    error = null;
    file = files[0];
    try {
      const buf = await file.arrayBuffer();
      const doc = await PDFDocument.load(buf);
      totalPages = doc.getPageCount();
      pageOrder = Array.from({ length: totalPages }, (_, i) => i + 1);
    } catch {
      error = 'Could not read this PDF. The file may be corrupted or password-protected.';
      file = null;
    }
  }

  function moveUp(index: number) {
    if (index === 0) return;
    const next = [...pageOrder];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    pageOrder = next;
  }

  function moveDown(index: number) {
    if (index === pageOrder.length - 1) return;
    const next = [...pageOrder];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    pageOrder = next;
  }

  async function handleProcess() {
    if (!file) return;
    processing = true;
    error = null;
    try {
      const result = await reorderPages(file, pageOrder);
      downloadBlob(result, `reordered-${file.name}`);
    } catch {
      error = 'Failed to reorder the PDF. Please try again.';
    }
    processing = false;
  }

  function clearFile() { file = null; totalPages = 0; pageOrder = []; error = null; }
</script>

<svelte:head>
  <title>PaperKit — Reorder Pages</title>
</svelte:head>

<ToolLayout title="Reorder Pages" description="Change page order. Drag to rearrange using the up/down buttons.">
  {#if !file}
    <DropZone accept=".pdf" onFiles={handleFile} />
  {:else}
    <div class="file-bar">
      <span class="filename">{file.name}</span>
      <span class="page-count">{totalPages} page{totalPages !== 1 ? 's' : ''}</span>
      <button onclick={clearFile} class="btn-ghost">Remove</button>
    </div>

    <div class="page-list">
      {#each pageOrder as page, i}
        <div class="file-row">
          <span class="index">{i + 1}</span>
          <span class="page-label">Page {page}</span>
          <div class="actions">
            <button onclick={() => moveUp(i)} disabled={i === 0} title="Move up" aria-label="Move up">↑</button>
            <button onclick={() => moveDown(i)} disabled={i === pageOrder.length - 1} title="Move down" aria-label="Move down">↓</button>
          </div>
        </div>
      {/each}
    </div>

    {#if error}
      <div class="error-msg">{error}</div>
    {/if}

    <button class="btn-primary" onclick={handleProcess} disabled={processing}>
      {processing ? 'Processing...' : 'Reorder Pages'}
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
  .page-list {
    margin: 1.5rem 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .file-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 0.6rem 1rem;
  }
  .index {
    width: 24px;
    height: 24px;
    background: var(--bg);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-secondary);
  }
  .page-label { flex: 1; font-size: 0.9rem; font-weight: 500; }
  .actions { display: flex; gap: 0.25rem; }
  .actions button {
    background: none;
    border: 1px solid var(--border);
    border-radius: 6px;
    width: 44px;
    height: 44px;
    cursor: pointer;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s;
  }
  .actions button:hover:not(:disabled) { background: var(--bg); }
  .actions button:disabled { opacity: 0.3; cursor: not-allowed; }
  .error-msg {
    background: #fef2f2;
    color: #dc2626;
    padding: 0.75rem 1rem;
    border-radius: var(--radius);
    margin-bottom: 1rem;
    font-size: 0.9rem;
  }
</style>
