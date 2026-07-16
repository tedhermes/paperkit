<script lang="ts">
  import DropZone from '$lib/components/DropZone.svelte';
  import ToolLayout from '$lib/components/ToolLayout.svelte';
  import { addWatermark, downloadBlob, validateFileSize } from '$lib/pdf/process';

  let file = $state<File | null>(null);
  let watermarkText = $state('CONFIDENTIAL');
  let opacity = $state(0.15);
  let fontSize = $state(48);
  let rotation = $state(-45);
  let processing = $state(false);
  let error = $state<string | null>(null);

  async function handleFile(files: File[]) {
    error = null;
    file = files[0];
  }

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
    } catch {
      error = 'Failed to add watermark. Please try again.';
    }
    processing = false;
  }

  function clearFile() { file = null; error = null; }
</script>

<svelte:head>
  <title>PaperKit — Watermark PDF</title>
</svelte:head>

<ToolLayout title="Watermark" description="Add text watermarks with custom opacity.">
  {#if !file}
    <DropZone accept=".pdf" onFiles={handleFile} />
  {:else}
    <div class="file-bar">
      <span class="filename">{file.name}</span>
      <span class="page-count">{(file.size / 1024).toFixed(0)} KB</span>
      <button onclick={clearFile} class="btn-ghost">Remove</button>
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

    {#if error}
      <div class="error-msg">{error}</div>
    {/if}

    <button class="btn-primary" onclick={handleProcess} disabled={processing || !watermarkText.trim()}>
      {processing ? 'Processing...' : 'Add Watermark'}
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
  .slider {
    width: 100%;
    accent-color: var(--accent);
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
