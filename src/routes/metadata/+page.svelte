<script lang="ts">
  import DropZone from '$lib/components/DropZone.svelte';
  import ToolLayout from '$lib/components/ToolLayout.svelte';
  import { readMetadata, editMetadata, downloadBlob, validateFileSize } from '$lib/pdf/process';
  import type { PDFMetadata } from '$lib/pdf/process';

  let file = $state<File | null>(null);
  let metadata = $state<PDFMetadata | null>(null);
  let processing = $state(false);
  let error = $state<string | null>(null);

  // Editable fields
  let editTitle = $state('');
  let editAuthor = $state('');
  let editSubject = $state('');
  let editKeywords = $state('');

  let hasChanges = $derived(
    metadata !== null && (
      editTitle !== (metadata.title ?? '') ||
      editAuthor !== (metadata.author ?? '') ||
      editSubject !== (metadata.subject ?? '') ||
      editKeywords !== (metadata.keywords ?? '')
    )
  );

  async function handleFile(files: File[]) {
    error = null;
    const f = files[0];
    const sizeErr = validateFileSize(f);
    if (sizeErr) {
      error = sizeErr;
      return;
    }
    file = f;
    try {
      const meta = await readMetadata(f);
      metadata = meta;
      editTitle = meta.title;
      editAuthor = meta.author;
      editSubject = meta.subject;
      editKeywords = meta.keywords;
    } catch {
      error = "This doesn't look like a PDF file. Please upload a .pdf file.";
      file = null;
      metadata = null;
    }
  }

  async function handleSave() {
    if (!file || !metadata) return;
    processing = true;
    error = null;
    try {
      const result = await editMetadata(file, {
        title: editTitle,
        author: editAuthor,
        subject: editSubject,
        keywords: editKeywords,
      });
      const baseName = file.name.replace(/\.pdf$/i, '');
      downloadBlob(result, `${baseName}-meta.pdf`);
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes('Invalid PDF') || msg.includes('header')) {
        error = "This doesn't look like a PDF file. Please upload a .pdf file.";
      } else if (msg.includes('password')) {
        error = 'This PDF is password-protected. Unlock it first.';
      } else {
        error = 'Something went wrong. Try a different file.';
      }
    }
    processing = false;
  }

  function clearFile() {
    file = null;
    metadata = null;
    error = null;
  }
</script>

<svelte:head>
  <title>PaperKit — Metadata Editor</title>
</svelte:head>

<ToolLayout title="Metadata Editor" description="View and edit PDF metadata: title, author, subject, and keywords.">
  {#if !file}
    <div class="empty-state">
      <span class="empty-icon">🏷️</span>
      <h3>Ready to edit metadata</h3>
      <p>Drop your PDF here to view and edit its metadata.</p>
    </div>
    <DropZone accept=".pdf" onFiles={handleFile} />
  {:else if metadata}
    <div class="file-bar">
      <span class="file-icon">📄</span>
      <div class="file-info">
        <span class="filename">{file.name}</span>
        <span class="file-meta">{(file.size / 1024).toFixed(0)} KB</span>
      </div>
      <button onclick={clearFile} class="btn-ghost">Change file</button>
    </div>

    <div class="meta-form">
      <div class="form-group">
        <label for="meta-title">Title</label>
        <input
          id="meta-title"
          type="text"
          bind:value={editTitle}
          class="text-input"
          placeholder="Document title"
        />
      </div>

      <div class="form-group">
        <label for="meta-author">Author</label>
        <input
          id="meta-author"
          type="text"
          bind:value={editAuthor}
          class="text-input"
          placeholder="Author name"
        />
      </div>

      <div class="form-group">
        <label for="meta-subject">Subject</label>
        <input
          id="meta-subject"
          type="text"
          bind:value={editSubject}
          class="text-input"
          placeholder="Document subject"
        />
      </div>

      <div class="form-group">
        <label for="meta-keywords">Keywords</label>
        <input
          id="meta-keywords"
          type="text"
          bind:value={editKeywords}
          class="text-input"
          placeholder="Comma-separated keywords"
        />
      </div>

      <div class="readonly-fields">
        <span class="readonly-label">Read-only</span>
        <div class="readonly-row">
          <span class="readonly-key">Producer</span>
          <span class="readonly-val">{metadata.producer || '—'}</span>
        </div>
        <div class="readonly-row">
          <span class="readonly-key">Creator</span>
          <span class="readonly-val">{metadata.creator || '—'}</span>
        </div>
      </div>
    </div>

    {#if error}
      <div class="error-msg">{error}</div>
    {/if}

    <button
      class="btn-primary"
      onclick={handleSave}
      disabled={processing || !hasChanges}
    >
      {#if processing}
        <span class="spinner"></span> Processing...
      {:else}
        Save Metadata &amp; Download
      {/if}
    </button>
  {/if}
</ToolLayout>

<style>
  .empty-state {
    text-align: center;
    padding: 2rem 0 1.5rem;
  }
  .empty-icon { font-size: 2.5rem; display: block; margin-bottom: 0.75rem; }
  .empty-state h3 { font-size: 1.15rem; margin-bottom: 0.4rem; }
  .empty-state p { color: var(--text-secondary); font-size: 0.9rem; }

  .file-bar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: var(--accent-light);
    padding: 0.8rem 1rem;
    border-radius: var(--radius);
    margin-bottom: 1.5rem;
  }
  .file-icon { font-size: 1.5rem; }
  .file-info { flex: 1; display: flex; flex-direction: column; gap: 0.15rem; }
  .filename { font-weight: 600; font-size: 0.9rem; word-break: break-all; }
  .file-meta { font-size: 0.8rem; color: var(--text-secondary); }
  .btn-ghost {
    background: none;
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 0.4rem 0.8rem;
    cursor: pointer;
    font-size: 0.8rem;
    color: var(--text-secondary);
    font-family: inherit;
    white-space: nowrap;
    transition: border-color 0.15s, color 0.15s;
  }
  .btn-ghost:hover { border-color: var(--accent); color: var(--accent); }

  .meta-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  .form-group { display: flex; flex-direction: column; gap: 0.35rem; }
  .form-group label { font-weight: 600; font-size: 0.85rem; color: var(--text-secondary); }
  .text-input {
    padding: 0.6rem 0.8rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    font-size: 0.9rem;
    font-family: inherit;
    background: var(--surface);
    color: var(--text);
    transition: border-color 0.15s;
  }
  .text-input:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-light);
  }
  .text-input::placeholder { color: var(--text-secondary); opacity: 0.5; }

  .readonly-fields {
    margin-top: 0.5rem;
    padding: 0.75rem 1rem;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .readonly-label {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-secondary);
  }
  .readonly-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.25rem 0;
    border-bottom: 1px solid var(--border);
  }
  .readonly-row:last-child { border-bottom: none; }
  .readonly-key { font-size: 0.8rem; color: var(--text-secondary); }
  .readonly-val { font-size: 0.85rem; max-width: 60%; text-align: right; word-break: break-all; }

  .btn-primary {
    width: 100%;
    padding: 0.75rem;
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    transition: opacity 0.15s;
  }
  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .btn-primary:not(:disabled):hover { opacity: 0.9; }

  .error-msg {
    padding: 0.75rem 1rem;
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #dc2626;
    border-radius: 6px;
    font-size: 0.85rem;
    margin-bottom: 1rem;
  }

  .spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  @media (max-width: 640px) {
    .file-bar { flex-wrap: wrap; gap: 0.5rem; }
    .file-info { min-width: 0; }
  }
</style>
