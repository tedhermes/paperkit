<script lang="ts">
  let { file, pageNum = 1, width = 140, selected = false, onClick }: {
    file: File;
    pageNum?: number;
    width?: number;
    selected?: boolean;
    onClick?: () => void;
  } = $props();

  import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

  let canvasEl = $state<HTMLCanvasElement | null>(null);
  let loaded = $state(false);
  let error = $state(false);
  let pageHeight = $state(0);

  $effect(() => {
    const canvas = canvasEl;
    if (!canvas || !file) return;

    let cancelled = false;

    async function render() {
      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

        const buf = await file.arrayBuffer();
        if (cancelled) return;

        const doc = await pdfjs.getDocument({ data: buf }).promise;
        if (cancelled) return;

        const page = await doc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1 });
        const scale = width / viewport.width;
        const scaled = page.getViewport({ scale });

        canvas.width = scaled.width;
        canvas.height = scaled.height;
        pageHeight = scaled.height;

        const ctx = canvas.getContext('2d')!;
        await page.render({ canvasContext: ctx, viewport: scaled }).promise;
        if (!cancelled) loaded = true;

        doc.destroy();
      } catch {
        if (!cancelled) error = true;
      }
    }

    render();
    return () => { cancelled = true; };
  });
</script>

<button
  class="thumb-wrapper"
  class:selected
  class:loaded
  onclick={onClick}
  type="button"
  aria-label="Page {pageNum}{selected ? ', selected' : ''}"
>
  {#if error}
    <div class="thumb-placeholder">!</div>
  {:else if !loaded}
    <div class="thumb-placeholder pulse">{pageNum}</div>
  {/if}
  <canvas bind:this={canvasEl} class="thumb-canvas" class:visible={loaded}></canvas>
  <span class="page-label">{pageNum}</span>
</button>

<style>
  .thumb-wrapper {
    position: relative;
    border: 2px solid var(--border);
    border-radius: 8px;
    overflow: hidden;
    cursor: pointer;
    background: var(--surface);
    transition: border-color 0.15s, box-shadow 0.15s;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0;
    font: inherit;
    color: inherit;
  }
  .thumb-wrapper:hover {
    border-color: var(--accent);
  }
  .thumb-wrapper.selected {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--accent-light);
  }
  .thumb-canvas {
    display: none;
    max-width: 100%;
    height: auto;
  }
  .thumb-canvas.visible {
    display: block;
  }
  .thumb-placeholder {
    width: 100%;
    aspect-ratio: 0.7;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
    font-size: 1.2rem;
    font-weight: 600;
    background: var(--bg);
  }
  .thumb-placeholder.pulse {
    animation: pulse 1.2s ease-in-out infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 0.8; }
  }
  .page-label {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-secondary);
    background: var(--bg);
    width: 100%;
    text-align: center;
  }
</style>
