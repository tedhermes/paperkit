<script lang="ts">
  import DropZone from '$lib/components/DropZone.svelte';
  import ToolLayout from '$lib/components/ToolLayout.svelte';
  import PageThumbnail from '$lib/components/PageThumbnail.svelte';
  import { splitPDF, downloadBlob } from '$lib/pdf/process';
  import { PDFDocument } from 'pdf-lib';

  let file = $state<File | null>(null);
  let totalPages = $state(0);
  let selectedPages = $state<Set<number>>(new Set());
  let rangeMode = $state<'all' | 'selected' | 'range'>('all');
  let rangeStart = $state(1);
  let rangeEnd = $state(1);
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
      rangeEnd = totalPages;
      rangeMode = 'all';
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

  let outputSummary = $derived.by(() => {
    if (rangeMode === 'all') {
      return `Output: ${totalPages} separate file${totalPages !== 1 ? 's' : ''}`;
    } else if (rangeMode === 'selected') {
      if (selectedPages.size === 0) return 'Output: 0 files';
      return `Output: ${selectedPages.size} separate file${selectedPages.size !== 1 ? 's' : ''}`;
    } else {
      const from = Math.min(rangeStart, rangeEnd);
      const to = Math.max(rangeStart, rangeEnd);
      const count = Math.min(to, totalPages) - Math.min(from, totalPages) + 1;
      return `Output: 1 file (pages ${from}\u2013${to})`;
    }
  });

  async function handleSplit() {
    if (!file) return;
    const currentFile = file;
    processing = true;
    error = null;

    let ranges: { start: number; end: number }[];
    if (rangeMode === 'all') {
      ranges = Array.from({ length: totalPages }, (_, i) => ({ start: i + 1, end: i + 1 }));
    } else if (rangeMode === 'selected') {
      ranges = Array.from(selectedPages).sort((a, b) => a - b).map((p) => ({ start: p, end: p }));
    } else {
      ranges = [{ start: rangeStart, end: Math.min(rangeEnd, totalPages) }];
    }

    try {
      const results = await splitPDF(currentFile, ranges);
      if (results.length === 1) {
        downloadBlob(results[0], `split-${currentFile.name}`);
      } else {
        results.forEach((data, i) => {
          downloadBlob(data, `split-${i + 1}-${currentFile.name}`);
        });
      }
    } catch {
      error = 'Failed to split the PDF. Please try again.';
    }
    processing = false;
  }

  function clearFile() { file = null; totalPages = 0; selectedPages = new Set(); error = null; }
</script>

<svelte:head>
  <title>PaperKit — Split PDF</title>
</svelte:head>

<ToolLayout title="Split PDF" description="Extract pages or split a PDF into multiple files.">
  {#if !file}
    <DropZone accept=".pdf" onFiles={handleFile} />
  {:else}
    <div class="file-bar">
      <span class="filename">{file.name}</span>
      <span class="page-count">{totalPages} page{totalPages !== 1 ? 's' : ''}</span>
      <button onclick={clearFile} class="btn-ghost">Remove</button>
    </div>

    <div class="pill-group">
      <button
        class="pill"
        class:active={rangeMode === 'all'}
        onclick={() => rangeMode = 'all'}
      >All pages</button>
      <button
        class="pill"
        class:active={rangeMode === 'selected'}
        onclick={() => rangeMode = 'selected'}
      >Select pages</button>
      <button
        class="pill"
        class:active={rangeMode === 'range'}
        onclick={() => rangeMode = 'range'}
      >Page range</button>
    </div>

    {#if rangeMode === 'all'}
      <p class="summary-text">All pages — each page becomes its own file.</p>
      <div class="thumb-grid">
        {#each Array.from({ length: totalPages }, (_, i) => i + 1) as n}
          <PageThumbnail {file} pageNum={n} width={130} />
        {/each}
      </div>
    {:else if rangeMode === 'selected'}
      <p class="summary-text">Select pages (each selected page becomes its own file).</p>
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
    {:else if rangeMode === 'range'}
      <div class="range-inputs">
        <div class="form-group">
          <label for="range-start">From:</label>
          <input id="range-start" type="number" bind:value={rangeStart} min="1" max={totalPages} class="num-input" />
        </div>
        <div class="form-group">
          <label for="range-end">To:</label>
          <input id="range-end" type="number" bind:value={rangeEnd} min="1" max={totalPages} class="num-input" />
        </div>
      </div>
    {/if}

    <p class="output-summary">{outputSummary}</p>

    {#if error}
      <div class="error-msg">{error}</div>
    {/if}

    <button class="btn-primary" onclick={handleSplit} disabled={processing || (rangeMode === 'selected' && selectedPages.size === 0)}>
      {#if processing}
        <span class="spinner"></span> Processing&hellip;
      {:else}
        Split PDF
      {/if}
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
  .summary-text {
    font-size: 0.9rem;
    color: var(--text-secondary);
    margin-bottom: 1rem;
  }
  .output-summary {
    font-size: 0.9rem;
    color: var(--text-secondary);
    font-weight: 600;
    margin-bottom: 1rem;
  }
  .thumb-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }
  .range-inputs {
    display: flex;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  .range-inputs label { font-size: 0.9rem; display: flex; align-items: center; gap: 0.5rem; }
  .range-inputs input {
    width: 80px;
    padding: 0.4rem 0.5rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    font-size: 0.9rem;
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
    .range-inputs { flex-direction: column; }
  }
</style>
