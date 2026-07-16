<script lang="ts">
  const tools = [
    { name: 'Split PDF', desc: 'Extract pages from a PDF or split into separate files.', href: '/split', available: true },
    { name: 'Merge PDFs', desc: 'Combine multiple PDFs into a single document.', href: '/merge', available: true },
    { name: 'Compress', desc: 'Reduce PDF file size.', href: '#', available: false },
    { name: 'Rotate', desc: 'Rotate individual pages.', href: '#', available: false },
  ];
</script>

<svelte:head>
  <title>PaperKit — PDF tools that stay on your device</title>
</svelte:head>

<section class="hero">
  <h1>PDF tools that stay on your device.</h1>
  <p>Split, merge, and more — all processing happens in your browser. No uploads, no servers, no privacy concerns.</p>
</section>

<section class="tools">
  {#each tools as tool}
    <a href={tool.href} class="tool-card" class:disabled={!tool.available} aria-disabled={!tool.available ? true : undefined} tabindex={!tool.available ? -1 : undefined}>
      <h3>{tool.name}</h3>
      <p>{tool.desc}</p>
      {#if !tool.available}
        <span class="badge">Soon</span>
      {/if}
    </a>
  {/each}
</section>

<style>
  .hero {
    text-align: center;
    padding: 3rem 0 2rem;
  }
  .hero h1 {
    font-size: 2.2rem;
    font-weight: 700;
    margin-bottom: 0.75rem;
  }
  .hero p {
    color: var(--text-secondary);
    max-width: 500px;
    margin: 0 auto;
    font-size: 1.05rem;
  }
  .tools {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 1rem;
    margin-top: 2rem;
  }
  .tool-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1.5rem;
    text-decoration: none;
    color: var(--text);
    transition: box-shadow 0.2s, transform 0.2s;
    position: relative;
  }
  .tool-card:not(.disabled):hover {
    box-shadow: var(--shadow-lg);
    transform: translateY(-2px);
  }
  .tool-card.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .tool-card h3 { font-size: 1.1rem; margin-bottom: 0.4rem; }
  .tool-card p { color: var(--text-secondary); font-size: 0.9rem; }
  .badge {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    background: #94a3b8;
    padding: 0.15rem 0.5rem;
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    color: #ffffff;
  }

  @media (max-width: 640px) {
    .hero h1 { font-size: 1.5rem; }
    .tools { grid-template-columns: 1fr; }
  }
</style>
