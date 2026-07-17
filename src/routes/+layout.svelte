<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';
  let { children } = $props();

  let toolsOpen = $state(false);
  let mobileOpen = $state(false);

  const categories = [
    {
      name: 'Page Management',
      tools: [
        { name: 'Split', href: '/split' },
        { name: 'Merge', href: '/merge' },
        { name: 'Reorder', href: '/reorder' },
        { name: 'Remove', href: '/remove' },
        { name: 'Extract', href: '/extract' },
        { name: 'Crop', href: '/crop' },
        { name: 'Rotate', href: '/rotate' },
      ]
    },
    {
      name: 'Content',
      tools: [
        { name: 'Watermark', href: '/watermark' },
        { name: 'Page Numbers', href: '/pagenumbers' },
        { name: 'Add Text', href: '/addtext' },
      ]
    },
    {
      name: 'Security',
      tools: [
        { name: 'Protect', href: '/protect' },
        { name: 'Unlock', href: '/unlock' },
      ]
    },
  ];

  let currentPath = $derived($page.url.pathname);

  function closeDropdown() {
    toolsOpen = false;
  }

  function toggleDropdown() {
    toolsOpen = !toolsOpen;
  }

  function closeMobile() {
    mobileOpen = false;
  }

  function toggleMobile() {
    mobileOpen = !mobileOpen;
  }

  function handleOverlayClick() {
    closeMobile();
  }

  let dropdownRef = $state();

  function handleEsc(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      closeMobile();
      closeDropdown();
    }
  }

  function handleWindowClick(e: MouseEvent) {
    if (toolsOpen && dropdownRef && !dropdownRef.contains(e.target as Node)) {
      closeDropdown();
    }
  }
</script>

<svelte:head>
  <title>PaperKit</title>
</svelte:head>

<svelte:window onkeydown={handleEsc} onclick={handleWindowClick} />

<header>
  <nav>
    <a href="/" class="logo">
      <img src="/paperkit-logo.svg" alt="" class="logo-icon" />
      PaperKit
    </a>

    <!-- Desktop links -->
    <div class="nav-links desktop-only">
      <div class="dropdown" bind:this={dropdownRef}>
        <button
          class="nav-link dropdown-trigger"
          onclick={toggleDropdown}
          onmouseenter={() => toolsOpen = true}
          aria-expanded={toolsOpen}
          aria-haspopup="true"
        >
          Tools ▾
        </button>
        {#if toolsOpen}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <div class="dropdown-panel" role="menu" tabindex="-1" onmouseleave={() => toolsOpen = false}>
            {#each categories as cat}
              <div class="dropdown-group">
                <span class="dropdown-group-title">{cat.name}</span>
                {#each cat.tools as tool}
                  <a
                    href={tool.href}
                    class="dropdown-link"
                    class:active={currentPath === tool.href}
                    role="menuitem"
                    onclick={closeDropdown}
                  >
                    {tool.name}
                  </a>
                {/each}
              </div>
            {/each}
          </div>
        {/if}
      </div>
      <a href="/split" class="nav-link" class:active={currentPath === '/split'} aria-current={currentPath === '/split' ? 'page' : undefined}>Split</a>
      <a href="/merge" class="nav-link" class:active={currentPath === '/merge'} aria-current={currentPath === '/merge' ? 'page' : undefined}>Merge</a>
      <a href="/watermark" class="nav-link" class:active={currentPath === '/watermark'} aria-current={currentPath === '/watermark' ? 'page' : undefined}>Watermark</a>
    </div>

    <!-- Mobile hamburger -->
    <button class="hamburger mobile-only" onclick={toggleMobile} aria-label="Toggle menu">
      <span></span>
      <span></span>
      <span></span>
    </button>
  </nav>
</header>

<!-- Mobile slide-out panel -->
{#if mobileOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="mobile-overlay" role="presentation" onclick={handleOverlayClick}></div>
  <div class="mobile-panel" role="dialog" aria-label="Navigation menu">
    <button class="mobile-close" onclick={closeMobile} aria-label="Close menu">✕</button>
    <a href="/" class="mobile-logo" onclick={closeMobile}>
      <img src="/paperkit-logo.svg" alt="" class="logo-icon" />
      PaperKit
    </a>
    {#each categories as cat}
      <div class="mobile-group">
        <h3>{cat.name}</h3>
        {#each cat.tools as tool}
          <a
            href={tool.href}
            class="mobile-link"
            class:active={currentPath === tool.href}
            onclick={closeMobile}
          >
            {tool.name}
          </a>
        {/each}
      </div>
    {/each}
  </div>
{/if}

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

  /* ── Nav Links (Desktop) ──────────────────────────── */
  .nav-links {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
  .nav-link {
    padding: 0.4rem 0.75rem;
    border-radius: 8px;
    color: var(--text-secondary);
    text-decoration: none;
    font-size: 0.875rem;
    font-weight: 500;
    transition: background 0.15s, color 0.15s;
    background: none;
    border: none;
    cursor: pointer;
    font-family: inherit;
    line-height: 1.4;
  }
  .nav-link:hover {
    background: var(--accent-light);
    color: var(--accent);
  }
  .nav-link.active {
    background: var(--accent-light);
    color: var(--accent);
  }

  /* ── Dropdown ──────────────────────────────────────── */
  .dropdown {
    position: relative;
  }
  .dropdown-trigger {
    white-space: nowrap;
  }
  .dropdown-panel {
    position: absolute;
    top: 100%;
    left: 0;
    margin-top: 0.5rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow-lg);
    padding: 1.25rem;
    display: flex;
    gap: 2rem;
    min-width: 520px;
    z-index: 100;
  }
  .dropdown-group {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }
  .dropdown-group-title {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-secondary);
    margin-bottom: 0.3rem;
  }
  .dropdown-link {
    padding: 0.3rem 0.5rem;
    border-radius: 6px;
    color: var(--text);
    text-decoration: none;
    font-size: 0.85rem;
    white-space: nowrap;
    transition: background 0.15s, color 0.15s;
  }
  .dropdown-link:hover {
    background: var(--accent-light);
    color: var(--accent);
  }
  .dropdown-link.active {
    background: var(--accent-light);
    color: var(--accent);
    font-weight: 600;
  }

  /* ── Mobile hamburger ─────────────────────────────── */
  .hamburger {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .hamburger span {
    display: block;
    width: 22px;
    height: 2px;
    background: var(--text);
    border-radius: 2px;
    transition: transform 0.2s;
  }

  /* ── Mobile overlay ───────────────────────────────── */
  .mobile-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.3);
    z-index: 50;
  }

  /* ── Mobile slide-out panel ───────────────────────── */
  .mobile-panel {
    position: fixed;
    top: 0;
    right: 0;
    width: 280px;
    height: 100%;
    background: var(--surface);
    z-index: 60;
    padding: 1.5rem;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    animation: slideIn 0.25s ease;
  }
  @keyframes slideIn {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }
  .mobile-close {
    align-self: flex-end;
    background: none;
    border: none;
    font-size: 1.3rem;
    cursor: pointer;
    padding: 0.5rem;
    color: var(--text);
    line-height: 1;
  }
  .mobile-logo {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 700;
    font-size: 1.15rem;
    color: var(--text);
    text-decoration: none;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--border);
  }
  .mobile-group h3 {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-secondary);
    margin-bottom: 0.35rem;
  }
  .mobile-link {
    display: block;
    padding: 0.5rem 0;
    color: var(--text);
    text-decoration: none;
    font-size: 0.95rem;
    border-bottom: 1px solid var(--border);
    transition: color 0.15s;
  }
  .mobile-link:hover {
    color: var(--accent);
  }
  .mobile-link.active {
    color: var(--accent);
    font-weight: 600;
  }

  /* ── Main & Footer (unchanged) ────────────────────── */
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

  /* ── Responsive ───────────────────────────────────── */
  .desktop-only { display: flex; }
  .mobile-only { display: none; }

  @media (max-width: 640px) {
    .desktop-only { display: none; }
    .mobile-only { display: flex; }
  }
</style>
