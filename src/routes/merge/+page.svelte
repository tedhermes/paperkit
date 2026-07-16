<script lang="ts">
  import DropZone from '$lib/components/DropZone.svelte';
  import ToolLayout from '$lib/components/ToolLayout.svelte';
  import { mergePDFs, downloadBlob } from '$lib/pdf/process';

  let files = $state<File[]>([]);
  let processing = $state(false);
  let error = $state<string | null>(null);

  function handleFiles(newFiles: File[]) {
    error = null;
    files = [...files, ...newFiles];
  }

  function removeFile(index: number) {
    error = null;
    files = files.filter((_, i) => i !== index);
  }

  function moveUp(index: number) {
    if (index === 0) return;
    const next = [...files];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    files = next;
  }

  function moveDown(index: number) {
    if (index === files.length - 1) return;
    const next = [...files];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    files = next;
  }

  async function handleMerge() {
    if (files.length < 2) return;
    processing = true;
    error = null;
    try {
      const result = await mergePDFs(files);
      downloadBlob(result, 'merged.pdf');
    } catch {
      error = 'Could not merge these PDFs. One or more files may be corrupted or password-protected.';
    }
    processing = false;
  }
</script>

<svelte:head>
  <title>PaperKit — Merge PDFs</title>
</svelte:head>

<ToolLayout title="Merge PDFs" description="Combine multiple PDFs into one document. Drag to reorder.">
  <DropZone accept=".pdf" multiple={true} onFiles={handleFiles} />

  {#if files.length > 0}
    <div class="file-list">
      {#each files as f, i}
        <div class="file-row">
          <span class="index">{i + 1}</span>
          <span class="name">{f.name}</span>
          <span class="size">{(f.size / 1024).toFixed(0)} KB</span>
          <div class="actions">
            <button onclick={() => moveUp(i)} disabled={i === 0} title="Move up" aria-label="Move up">↑</button>
            <button onclick={() => moveDown(i)} disabled={i === files.length - 1} title="Move down" aria-label="Move down">↓</button>
            <button onclick={() => removeFile(i)} title="Remove" aria-label="Remove">×</button>
          </div>
        </div>
      {/each}
    </div>

    {#if error}
      <div class="error-msg">{error}</div>
    {/if}

    <button class="btn-primary" onclick={handleMerge} disabled={processing || files.length < 2}>
      {processing ? 'Merging...' : `Merge ${files.length} PDFs`}
    </button>
  {/if}
</ToolLayout>

<style>
  .file-list {
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
  .name { flex: 1; font-size: 0.9rem; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .size { color: var(--text-secondary); font-size: 0.8rem; }
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
