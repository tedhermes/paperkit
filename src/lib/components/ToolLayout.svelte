<script lang="ts">
  let { title, description, children } = $props();
</script>

<div class="tool-layout">
  <div class="tool-header">
    <a href="/" class="back">← Tools</a>
    <h2>{title}</h2>
    <p>{description}</p>
  </div>
  <div class="tool-content">
    {@render children()}
  </div>
</div>

<style>
  .tool-layout { max-width: 700px; margin: 0 auto; }
  .tool-header { margin-bottom: 2rem; }
  .back {
    color: var(--text-secondary);
    text-decoration: none;
    font-size: 0.85rem;
    display: inline-block;
    margin-bottom: 0.5rem;
  }
  .back:hover { color: var(--text); }
  h2 { font-size: 1.5rem; margin-bottom: 0.4rem; }
  .tool-header p { color: var(--text-secondary); font-size: 0.95rem; }
</style>
