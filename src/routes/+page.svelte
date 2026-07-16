<script lang="ts">
  const categories = [
    {
      name: 'Page Management',
      tools: [
        { name: 'Split PDF', desc: 'Extract pages from a PDF or split into separate files.', href: '/split', emoji: '✂️' },
        { name: 'Merge PDFs', desc: 'Combine multiple PDFs into a single document.', href: '/merge', emoji: '📑' },
        { name: 'Reorder', desc: 'Change page order. Drag to rearrange.', href: '/reorder', emoji: '🔀' },
        { name: 'Remove', desc: 'Delete unwanted pages.', href: '/remove', emoji: '🗑️' },
        { name: 'Extract', desc: 'Pull out selected pages into a new PDF.', href: '/extract', emoji: '📤' },
        { name: 'Crop', desc: 'Trim page margins.', href: '/crop', emoji: '✂️' },
        { name: 'Rotate', desc: 'Rotate pages 90°, 180°, or 270°.', href: '/rotate', emoji: '🔄' },
      ],
    },
    {
      name: 'Content',
      tools: [
        { name: 'Watermark', desc: 'Add text watermarks with custom opacity.', href: '/watermark', emoji: '💧' },
        { name: 'Page Numbers', desc: 'Add page numbers with custom position and format.', href: '/pagenumbers', emoji: '🔢' },
        { name: 'Add Text', desc: 'Place text anywhere on a page.', href: '/addtext', emoji: '📝' },
      ],
    },
    {
      name: 'Security',
      tools: [
        { name: 'Protect', desc: 'Add password protection. (Limited — see Roadmap)', href: '/protect', emoji: '🔒' },
        { name: 'Unlock', desc: 'Remove password. (Limited — see Roadmap)', href: '/unlock', emoji: '🔓' },
      ],
    },
    {
      name: 'More',
      tools: [
        { name: 'Compress', desc: 'Reduce file size. (Limited — see Roadmap)', href: '/compress', emoji: '📦' },
      ],
    },
  ];
</script>

<svelte:head>
  <title>PaperKit — PDF tools that stay on your device</title>
</svelte:head>

<section class="hero">
  <h1>PDF tools that stay on your device.</h1>
  <p>Split, merge, and more — all processing happens in your browser. No uploads, no servers, no privacy concerns.</p>
</section>

{#each categories as cat}
  <section class="category">
    <h2>{cat.name}</h2>
    <div class="tools">
      {#each cat.tools as tool}
        <a href={tool.href} class="tool-card">
          <span class="tool-emoji">{tool.emoji}</span>
          <h3>{tool.name}</h3>
          <p>{tool.desc}</p>
        </a>
      {/each}
    </div>
  </section>
{/each}

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
  .category {
    margin-top: 2.5rem;
  }
  .category h2 {
    font-size: 1.15rem;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 1rem;
    letter-spacing: 0.02em;
  }
  .tools {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 1rem;
  }
  .tool-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1.5rem;
    text-decoration: none;
    color: var(--text);
    transition: box-shadow 0.2s, transform 0.2s, border-color 0.2s;
    position: relative;
  }
  .tool-card:not(.disabled):hover {
    box-shadow: var(--shadow-lg);
    transform: translateY(-2px);
    border-color: var(--accent);
  }
  .tool-emoji {
    font-size: 1.6rem;
    display: block;
    margin-bottom: 0.5rem;
  }
  .tool-card h3 { font-size: 1.1rem; margin-bottom: 0.4rem; }
  .tool-card p { color: var(--text-secondary); font-size: 0.9rem; }

  @media (max-width: 640px) {
    .hero h1 { font-size: 1.5rem; }
    .tools { grid-template-columns: 1fr; }
  }
</style>
