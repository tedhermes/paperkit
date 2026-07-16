<script lang="ts">
  import DropZone from '$lib/components/DropZone.svelte';
  import ToolLayout from '$lib/components/ToolLayout.svelte';
  import { addPageNumbers, downloadBlob, validateFileSize } from '$lib/pdf/process';

  let file = $state<File | null>(null);
  let format = $state('{page} / {total}');
  let position = $state<'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-center'>('bottom-center');
  let startAt = $state(1);
  let fontSize = $state(12);
  let margin = $state(40);
  let processing = $state(false);
  let error = $state<string | null>(null);

  async function handleFile(files: File[]) {
    error = null;
    file = files[0];
  }

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
    } catch {
      error = 'Failed to add page numbers. Please try again.';
    }
    processing = false;
  }

  function clearFile() { file = null; error = null; }
</script>

<svelte:head>
  <title>PaperKit — Page Numbers</title>
</svelte:head>

<ToolLayout title="Page Numbers" description="Add page numbers with custom position and format.">
  {#if !file}
    <DropZone accept=".pdf" onFiles={handleFile} />
  {:else}
    <div class="file-bar">
      <span class="filename">{file.name}</span>
      <span class="page-count">{(file.size / 1024).toFixed(0)} KB</span>
      <button onclick={clearFile} class="btn-ghost">Remove</button>
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

    {#if error}
      <div class="error-msg">{error}</div>
    {/if}

    <button class="btn-primary" onclick={handleProcess} disabled={processing}>
      {processing ? 'Processing...' : 'Add Page Numbers'}
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
  .form-row {
    display: flex;
    gap: 1rem;
    margin-bottom: 0.5rem;
  }
  .form-row .form-group {
    flex: 1;
  }
  .text-input {
    width: 100%;
    padding: 0.6rem 0.75rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    font-size: 0.95rem;
  }
  .num-input {
    width: 100%;
    padding: 0.6rem 0.75rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    font-size: 0.95rem;
  }
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
  .error-msg {
    background: #fef2f2;
    color: #dc2626;
    padding: 0.75rem 1rem;
    border-radius: var(--radius);
    margin-bottom: 1rem;
    font-size: 0.9rem;
  }

  @media (max-width: 640px) {
    .form-row { flex-direction: column; }
  }
</style>
