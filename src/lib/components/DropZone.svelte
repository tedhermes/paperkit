<script lang="ts">
  let { accept = '.pdf', multiple = false, onFiles }: {
    accept?: string;
    multiple?: boolean;
    onFiles: (files: File[]) => void;
  } = $props();

  let dragging = $state(false);

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    dragging = false;
    const files = Array.from(e.dataTransfer?.files ?? []);
    if (files.length > 0) onFiles(files);
  }

  function handleChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (files.length > 0) onFiles(files);
    input.value = '';
  }
</script>

<div
  class="dropzone"
  class:active={dragging}
  role="button"
  tabindex="0"
  ondragover={(e) => { e.preventDefault(); dragging = true; }}
  ondragleave={() => dragging = false}
  ondrop={handleDrop}
>
  <input
    type="file"
    {accept}
    {multiple}
    onchange={handleChange}
    class="file-input"
    id="file-upload"
  />
  <label for="file-upload" class="drop-label">
    <div class="icon">📄</div>
    <p class="main-text">Drop PDF{multiple ? 's' : ''} here or click to browse</p>
    <p class="sub-text">{accept} files only</p>
  </label>
</div>

<style>
  .dropzone {
    border: 2px dashed var(--border);
    border-radius: var(--radius);
    padding: 2.5rem 2rem;
    text-align: center;
    transition: border-color 0.2s, background 0.2s;
    cursor: pointer;
    position: relative;
  }
  .dropzone.active {
    border-color: var(--accent);
    background: #fef2f2;
  }
  .file-input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }
  .drop-label { cursor: pointer; display: block; }
  .icon { font-size: 2rem; margin-bottom: 0.5rem; }
  .main-text { font-weight: 600; font-size: 1rem; }
  .sub-text { color: var(--text-secondary); font-size: 0.85rem; margin-top: 0.3rem; }
</style>
