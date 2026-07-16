<script lang="ts">
  import DropZone from '$lib/components/DropZone.svelte';
  import ToolLayout from '$lib/components/ToolLayout.svelte';
  import { unlockPDF, downloadBlob, validateFileSize } from '$lib/pdf/process';

  let file = $state<File | null>(null);
  let password = $state('');
  let processing = $state(false);
  let error = $state<string | null>(null);
  let roadmapMessage = $state<string | null>(null);

  async function handleFile(files: File[]) {
    error = null;
    roadmapMessage = null;
    file = files[0];
  }

  async function handleProcess() {
    if (!file) return;
    processing = true;
    error = null;
    roadmapMessage = null;
    try {
      const result = await unlockPDF(file, password);
      downloadBlob(result, `unlocked-${file.name}`);
    } catch (e) {
      roadmapMessage = (e as Error).message;
    }
    processing = false;
  }

  function clearFile() { file = null; error = null; roadmapMessage = null; }
</script>

<svelte:head>
  <title>PaperKit — Unlock PDF</title>
</svelte:head>

<ToolLayout title="Unlock PDF" description="Remove password. (Limited — see Roadmap)">
  {#if !file}
    <DropZone accept=".pdf" onFiles={handleFile} />
  {:else}
    <div class="file-bar">
      <span class="filename">{file.name}</span>
      <span class="page-count">{(file.size / 1024).toFixed(0)} KB</span>
      <button onclick={clearFile} class="btn-ghost">Remove</button>
    </div>

    <div class="form-group">
      <label for="pw">Password</label>
      <input id="pw" type="password" bind:value={password} class="text-input" placeholder="Enter password" />
    </div>

    {#if roadmapMessage}
      <div class="info-msg">{roadmapMessage}</div>
    {/if}

    {#if error}
      <div class="error-msg">{error}</div>
    {/if}

    <button class="btn-primary" onclick={handleProcess} disabled={processing}>
      {processing ? 'Processing...' : 'Unlock PDF'}
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
  .text-input {
    width: 100%;
    padding: 0.6rem 0.75rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    font-size: 0.95rem;
  }
  .info-msg {
    background: #fefce8;
    color: #a16207;
    padding: 0.75rem 1rem;
    border-radius: var(--radius);
    margin-bottom: 1rem;
    font-size: 0.9rem;
    border: 1px solid #fde68a;
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
