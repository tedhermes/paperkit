<script lang="ts">
  import DropZone from '$lib/components/DropZone.svelte';
  import ToolLayout from '$lib/components/ToolLayout.svelte';
  import { splitPDF, downloadBlob } from '$lib/pdf/process';
  import { PDFDocument } from 'pdf-lib';

  let file = $state<File | null>(null);
  let totalPages = $state(0);
  let selectedPages = $state<Set<number>>(new Set());
  let rangeMode = $state<'all' | 'selected' | 'range'>('all');
  let rangeStart = $state(1);
  let rangeEnd = $state(1);
  let processing = $state(false);

  async function handleFile(files: File[]) {
    file = files[0];
    const buf = await file.arrayBuffer();
    const doc = await PDFDocument.load(buf);
    totalPages = doc.getPageCount();
    selectedPages = new Set();
    rangeEnd = totalPages;
    rangeMode = 'all';
  }

  function togglePage(n: number) {
    const next = new Set(selectedPages);
    if (next.has(n)) next.delete(n); else next.add(n);
    selectedPages = next;
  }

  async function handleSplit() {
    if (!file) return;
    processing = true;

    let ranges: { start: number; end: number }[];
    if (rangeMode === 'all') {
      ranges = Array.from({ length: totalPages }, (_, i) => ({ start: i + 1, end: i + 1 }));
    } else if (rangeMode === 'selected') {
      ranges = Array.from(selectedPages).sort((a, b) => a - b).map((p) => ({ start: p, end: p }));
    } else {
      ranges = [{ start: rangeStart, end: Math.min(rangeEnd, totalPages) }];
    }

    const results = await splitPDF(file, ranges);
    if (results.length === 1) {
      downloadBlob(results[0], `split-${file.name}`);
    } else {
      results.forEach((data, i) => {
        downloadBlob(data, `split-${i + 1}-${file.name}`);
      });
    }
    processing = false;
  }

  function clearFile() { file = null; totalPages = 0; selectedPages = new Set(); }
</script>

<ToolLayout title="Split PDF" description="Extract pages or split a PDF into multiple files.">
  {#if !file}
    <DropZone accept=".pdf" onFiles={handleFile} />
  {:else}
    <div class="file-bar">
      <span class="filename">{file.name}</span>
      <span class="page-count">{totalPages} page{totalPages !== 1 ? 's' : ''}</span>
      <button onclick={clearFile} class="btn-ghost">Remove</button>
    </div>

    <div class="mode-select">
      <label><input type="radio" bind:group={rangeMode} value="all" /> All pages (one file per page)</label>
      <label><input type="radio" bind:group={rangeMode} value="selected" /> Select pages</label>
      <label><input type="radio" bind:group={rangeMode} value="range" /> Page range</label>
    </div>

    {#if rangeMode === 'selected'}
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
    {:else if rangeMode === 'range'}
      <div class="range-inputs">
        <label>From: <input type="number" bind:value={rangeStart} min="1" max={totalPages} /></label>
        <label>To: <input type="number" bind:value={rangeEnd} min="1" max={totalPages} /></label>
      </div>
    {/if}

    <button class="btn-primary" onclick={handleSplit} disabled={processing || (rangeMode === 'selected' && selectedPages.size === 0)}>
      {processing ? 'Processing...' : 'Split PDF'}
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
  .mode-select {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }
  .mode-select label {
    font-size: 0.9rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .page-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }
  .page-btn {
    width: 40px;
    height: 40px;
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
  .range-inputs {
    display: flex;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  .range-inputs label { font-size: 0.9rem; }
  .range-inputs input {
    width: 80px;
    padding: 0.4rem 0.5rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    font-size: 0.9rem;
    margin-left: 0.4rem;
  }
  .btn-primary {
    width: 100%;
    padding: 0.85rem;
    background: var(--accent);
    color: white;
    border: none;
    border-radius: var(--radius);
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }
  .btn-primary:hover:not(:disabled) { background: var(--accent-hover); }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
