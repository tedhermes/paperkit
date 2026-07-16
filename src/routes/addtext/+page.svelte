<script lang="ts">
  import DropZone from '$lib/components/DropZone.svelte';
  import ToolLayout from '$lib/components/ToolLayout.svelte';
  import { addTextToPage, downloadBlob, validateFileSize } from '$lib/pdf/process';
  import { PDFDocument } from 'pdf-lib';

  let file = $state<File | null>(null);
  let totalPages = $state(0);
  let pageNum = $state(1);
  let text = $state('');
  let posX = $state(50);
  let posY = $state(50);
  let fontSize = $state(14);
  let fontFamily = $state<'helvetica' | 'helvetica-bold' | 'times' | 'courier'>('helvetica');
  let hexColor = $state('#000000');
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
    } catch {
      error = 'Could not read this PDF. The file may be corrupted or password-protected.';
      file = null;
    }
  }

  function hexToRgb(hex: string): [number, number, number] {
    const h = hex.replace('#', '');
    return [
      parseInt(h.substring(0, 2), 16) / 255,
      parseInt(h.substring(2, 4), 16) / 255,
      parseInt(h.substring(4, 6), 16) / 255,
    ];
  }

  async function handleProcess() {
    if (!file || !text.trim()) return;
    processing = true;
    error = null;
    try {
      const color = hexToRgb(hexColor);
      const result = await addTextToPage(file, pageNum, text, {
        x: posX,
        y: posY,
        fontSize,
        fontFamily,
        color,
      });
      downloadBlob(result, `text-${file.name}`);
    } catch {
      error = 'Failed to add text. Please try again.';
    }
    processing = false;
  }

  function clearFile() { file = null; totalPages = 0; error = null; }
</script>

<svelte:head>
  <title>PaperKit — Add Text</title>
</svelte:head>

<ToolLayout title="Add Text" description="Place text anywhere on a page.">
  {#if !file}
    <DropZone accept=".pdf" onFiles={handleFile} />
  {:else}
    <div class="file-bar">
      <span class="filename">{file.name}</span>
      <span class="page-count">{totalPages} page{totalPages !== 1 ? 's' : ''}</span>
      <button onclick={clearFile} class="btn-ghost">Remove</button>
    </div>

    <div class="form-group">
      <label>Page to add text to:</label>
      <div class="page-grid">
        {#each Array.from({ length: totalPages }, (_, i) => i + 1) as n}
          <button
            class="page-btn"
            class:selected={pageNum === n}
            onclick={() => pageNum = n}
          >
            {n}
          </button>
        {/each}
      </div>
    </div>

    <div class="form-group">
      <label for="at-text">Text to add</label>
      <input id="at-text" type="text" bind:value={text} class="text-input" placeholder="Enter text..." />
    </div>

    <div class="form-row">
      <div class="form-group">
        <label for="at-x">X position (pts from left)</label>
        <input id="at-x" type="number" bind:value={posX} min="0" max={1000} class="num-input" />
      </div>
      <div class="form-group">
        <label for="at-y">Y position (pts from top)</label>
        <input id="at-y" type="number" bind:value={posY} min="0" max={1000} class="num-input" />
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label for="at-size">Font size</label>
        <input id="at-size" type="number" bind:value={fontSize} min="6" max="200" class="num-input" />
      </div>
      <div class="form-group">
        <label for="at-font">Font family</label>
        <select id="at-font" bind:value={fontFamily} class="select-input">
          <option value="helvetica">Helvetica</option>
          <option value="helvetica-bold">Helvetica Bold</option>
          <option value="times">Times Roman</option>
          <option value="courier">Courier</option>
        </select>
      </div>
    </div>

    <div class="form-group">
      <label for="at-color">Color (hex)</label>
      <div class="color-picker">
        <input id="at-color" type="color" bind:value={hexColor} class="color-input" />
        <input type="text" bind:value={hexColor} class="hex-input" placeholder="#000000" />
      </div>
    </div>

    {#if error}
      <div class="error-msg">{error}</div>
    {/if}

    <button class="btn-primary" onclick={handleProcess} disabled={processing || !text.trim()}>
      {processing ? 'Processing...' : 'Add Text'}
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
  .select-input {
    width: 100%;
    padding: 0.6rem 0.75rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    font-size: 0.95rem;
    background: var(--surface);
  }
  .color-picker {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .color-input {
    width: 44px;
    height: 44px;
    border: 1px solid var(--border);
    border-radius: 8px;
    cursor: pointer;
    padding: 2px;
  }
  .hex-input {
    flex: 1;
    padding: 0.6rem 0.75rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    font-size: 0.95rem;
    font-family: monospace;
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
