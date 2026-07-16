<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';
  let { children } = $props();
</script>

<header>
  <nav>
    <a href="/" class="logo">
      <img src="/paperkit-logo.svg" alt="PaperKit" class="logo-icon" />
      PaperKit
    </a>
    <div class="nav-links">
      <a href="/split" aria-current={$page.url.pathname === '/split' ? 'page' : undefined}>Split</a>
      <a href="/merge" aria-current={$page.url.pathname === '/merge' ? 'page' : undefined}>Merge</a>
    </div>
  </nav>
</header>

<main>{@render children()}</main>

<footer>
  <p>All processing happens in your browser. No files are uploaded.</p>
</footer>

<style>
  header {
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    padding: 0 1.5rem;
    position: sticky;
    top: 0;
    z-index: 10;
  }
  nav {
    max-width: 1100px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 56px;
  }
  .logo {
    font-weight: 700;
    font-size: 1.25rem;
    color: var(--text);
    text-decoration: none;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .logo-icon {
    height: 28px;
    width: 28px;
  }
  .nav-links { display: flex; gap: 2rem; }
  .nav-links a {
    color: var(--text-secondary);
    text-decoration: none;
    font-size: 0.9rem;
    font-weight: 500;
  }
  .nav-links a:hover { color: var(--text); }
  main {
    max-width: 1100px;
    margin: 0 auto;
    padding: 3rem 1.5rem;
    min-height: calc(100vh - 56px - 60px);
  }
  footer {
    text-align: center;
    padding: 1.2rem;
    color: var(--text-secondary);
    font-size: 0.8rem;
    border-top: 1px solid var(--border);
  }

  @media (max-width: 640px) {
    .nav-links { gap: 1rem; }
  }
</style>
