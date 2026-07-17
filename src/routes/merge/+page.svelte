<script lang="ts">
  import DropZone from '$lib/components/DropZone.svelte';
  import ToolLayout from '$lib/components/ToolLayout.svelte';
  import { mergePDFs, downloadBlob } from '$lib/pdf/process';
  import { PDFDocument } from 'pdf-lib';

  let fileInfos = $state<{ file: File; pages: number }[]>([]);
  let processing = $state(false);
  let error = $state<string | null>(null);

  async function handleFiles(newFiles: File[]) {
    error = null;
    const newInfos: { file: File; pages: number }[] = [];
    for (const f of newFiles) {
      try {
        const buf = await f.arrayBuffer();
        const doc = await PDFDocument.load(buf);
        newInfos.push({ file: f, pages: doc.getPageCount() });
      } catch {
        newInfos.push({ file: f, pages: 0 });
      }
    }
    fileInfos = [...fileInfos, ...newInfos];
  }

  function removeFile(index: number) {
    error = null;
    fileInfos = fileInfos.filter((_, i) => i !== index);
  }

  function moveUp(index: number) {
    if (index === 0) return;
    const next = [...fileInfos];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    fileInfos = next;
  }

  function moveDown(index: number) {
    if (index === fileInfos.length - 1) return;
    const next = [...fileInfos];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    fileInfos = next;
  }

  function clearAll() {
    fileInfos = [];
    error = null;
  }

  async function handleMerge() {
    if (fileInfos.length < 2) return;
    processing = true;
    error = null;
    try {
      const files = fileInfos.map(info => info.file);
      const result = await mergePDFs(files);
      downloadBlob(result, 'merged.pdf');
    } catch {
      error = 'Could not merge these PDFs. One or more files may be corrupted or password-protected.';
    }
    processing = false;
  }

  let totalPages = $derived(fileInfos.reduce((sum, info) => sum + info.pages, 0));
</script>

<svelte:head>
  <title>PaperKit — Merge PDFs</title>
</svelte:head>

<ToolLayout title="Merge PDFs" description="Combine multiple PDFs into one document. Drag to reorder.">
  <DropZone accept=".pdf" multiple={true} onFiles={handleFiles} />

  {#if fileInfos.length > 0}
    <div class="summary-text">
      {fileInfos.length} file{fileInfos.length !== 1 ? 's' : ''}, {totalPages} page{totalPages !== 1 ? 's' : ''} → 1 merged PDF
    </div>

    <div class="file-list">
      {#each fileInfos as info, i}
        <div class="file-row">
          <span class="index">{i + 1}</span>
          <span class="name">{info.file.name}</span>
          <span class="meta">
            {#if info.pages > 0}
              {info.pages} page{info.pages !== 1 ? 's' : ''},
            {/if}
            {(info.file.size / 1024).toFixed(0)} KB
          </span>
          <div class="actions">
            <button onclick={() => moveUp(i)} disabled={i === 0} title="Move up" aria-label="Move up">↑</button>
            <button onclick={() => moveDown(i)} disabled={i === fileInfos.length - 1} title="Move down" aria-label="Move down">↓</button>
            <button onclick={() => removeFile(i)} title="Remove" aria-label="Remove">×</button>
          </div>
        </div>
      {/each}
    </div>

    <div class="action-row">
      {#if fileInfos.length > 0}
        <button class="btn-ghost" onclick={clearAll}>Clear all</button>
      {/if}

      {#if error}
        <div class="error-msg">{error}</div>
      {/if}

      <button class="btn-primary" onclick={handleMerge} disabled={processing || fileInfos.length < 2}>
        {#if processing}
          <span class="spinner"></span> Merging&hellip;
        {:else}
          Merge {fileInfos.length} PDFs
        {/if}
      </button>
    </div>
  {/if}
</ToolLayout>

<style>
  .summary-text {
    font-size: 0.9rem;
    color: var(--text-secondary);
    font-weight: 500;
    margin: 1rem 0;
  }
  .file-list {
    margin: 0.5rem 0 1rem;
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
    flex-shrink: 0;
  }
  .name { flex: 1; font-size: 0.9rem; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .meta { color: var(--text-secondary); font-size: 0.8rem; white-space: nowrap; }
  .actions { display: flex; gap: 0.25rem; flex-shrink: 0; }
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
  .action-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .btn-ghost {
    background: none;
    border: none;
    color: var(--accent);
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 500;
    padding: 0.25rem 0.5rem;
  }
  .error-msg {
    background: #fef2f2;
    color: #dc2626;
    padding: 0.75rem 1rem;
    border-radius: var(--radius);
    font-size: 0.9rem;
    flex: 1;
  }
</style>
