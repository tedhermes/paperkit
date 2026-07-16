<script lang="ts">
  import DropZone from '$lib/components/DropZone.svelte';
  import ToolLayout from '$lib/components/ToolLayout.svelte';
  import { compressPDF, downloadBlob, validateFileSize } from '$lib/pdf/process';
  import { PDFDocument } from 'pdf-lib';

  let file = $state<File | null>(null);
  let totalPages = $state(0);
  let processing = $state(false);
  let error = $state<string | null>(null);
  let roadmapMessage = $state<string | null>(null);

  async function handleFile(files: File[]) {
    error = null;
    roadmapMessage = null;
    file = files[0];
    try {
      const buf = await file.arrayBuffer();
      const doc = await PDFDocument.load(buf);
      totalPages = doc.getPageCount();
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes('Invalid PDF') || msg.includes('header')) {
        error = "This doesn't look like a PDF file. Please upload a .pdf file.";
      } else {
        error = "Couldn't read this PDF. The file may be damaged.";
      }
      file = null;
    }
  }

  async function handleProcess() {
    if (!file) return;
    processing = true;
    error = null;
    roadmapMessage = null;
    try {
      const result = await compressPDF(file);
      downloadBlob(result, `compressed-${file.name}`);
    } catch (e) {
      roadmapMessage = (e as Error).message;
    }
    processing = false;
  }

  function clearFile() { file = null; error = null; roadmapMessage = null; totalPages = 0; }
</script>

<svelte:head>
  <title>PaperKit — Compress PDF</title>
</svelte:head>

<ToolLayout title="Compress PDF" description="Reduce file size. (Limited — see Roadmap)">
  {#if !file}
    <div class="empty-state">
      <span class="empty-icon">📦</span>
      <h3>Ready to compress</h3>
      <p>Drop your PDF here to reduce file size.</p>
    </div>
    <DropZone accept=".pdf" onFiles={handleFile} />
  {:else}
    <div class="file-bar">
      <span class="file-icon">📄</span>
      <div class="file-info">
        <span class="filename">{file.name}</span>
        <span class="file-meta">{totalPages} page{totalPages !== 1 ? 's' : ''} &middot; {(file.size / 1024).toFixed(0)} KB</span>
      </div>
      <button onclick={clearFile} class="btn-ghost">Change file</button>
    </div>

    <p class="preview-info">Original size: {(file.size / 1024).toFixed(0)} KB</p>

    {#if roadmapMessage}
      <div class="info-msg">{roadmapMessage}</div>
    {/if}

    {#if error}
      <div class="error-msg">{error}</div>
    {/if}

    <button class="btn-primary" onclick={handleProcess} disabled={processing}>
      {#if processing}
        <span class="spinner"></span> Compressing...
      {:else}
        Compress PDF
      {/if}
    </button>
  {/if}
</ToolLayout>

<style>
  .preview-info {
    font-size: 0.9rem;
    color: var(--text-secondary);
    margin-bottom: 1rem;
  }
</style>
