# PaperKit — Design QA Audit

**Audited:** Thursday, July 16, 2026  
**Files reviewed:** `+page.svelte`, `+layout.svelte`, `app.css`, `DropZone.svelte`, `ToolLayout.svelte`, `split/+page.svelte`, `merge/+page.svelte`, `pdf/process.ts`  
**Browser:** Live preview at localhost:5173

---

## 🔴 Critical Issues

### C1. DropZone keyboard inoperable (Accessibility)
**Files:** `src/lib/components/DropZone.svelte:28-32`  
**Severity:** 🔴 High  
**Issue:** `<div class="dropzone">` has `role="button"` and `tabindex="0"`, making screen readers announce it as a focusable button, but **no `onkeydown` handler** exists. Keyboard users who tab to the dropzone and press Enter/Space get no response.  
**Fix:** Add an `onkeydown` handler that triggers `onFiles` when Enter or Space is pressed:
```svelte
onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); /* trigger file input */ document.getElementById('file-upload')?.click(); } }}
```

### C2. No focus-visible styles anywhere (Accessibility)
**Files:** All CSS — `+layout.svelte`, `+page.svelte`, `split/+page.svelte`, `merge/+page.svelte`, `DropZone.svelte`, `ToolLayout.svelte`, `app.css`  
**Severity:** 🔴 High  
**Issue:** Zero `:focus-visible` or `:focus` styles across the entire codebase. Keyboard users have no visible focus indicator when tabbing through interactive elements. Relies on browser defaults which vary wildly.  
**Fix:** Add global focus styles in `app.css`:
```css
:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: 4px;
}
```

### C3. No error handling for invalid/corrupted PDFs (Error States)
**Files:** `src/routes/split/+page.svelte:15-23`  
**Severity:** 🔴 High  
**Issue:** `PDFDocument.load(buf)` throws synchronously on invalid or corrupted PDFs with no `try/catch`. A non-PDF file dropped via drag-and-drop (bypassing the `accept` filter) or a corrupted PDF causes an unhandled runtime error. User sees a blank page or a Svelte error boundary, not a helpful message.  
**Fix:** Wrap in try/catch and show a user-facing error message:
```svelte
async function handleFile(files: File[]) {
  const f = files[0];
  if (!f.name.toLowerCase().endsWith('.pdf') && f.type !== 'application/pdf') {
    error = 'Please select a valid PDF file.';
    return;
  }
  try {
    const buf = await f.arrayBuffer();
    const doc = await PDFDocument.load(buf);
    // ... rest
  } catch {
    error = 'Could not read this PDF. The file may be corrupted or password-protected.';
  }
}
```
Same fix needed in `merge/+page.svelte`.

### C4. No unique page titles (Accessibility / SEO)
**File:** `src/routes/+layout.svelte:7`  
**Severity:** 🔴 High  
**Issue:** `<title>PaperKit</title>` is hardcoded in the layout. Every page — Home, Split, Merge — has the same tab title. Screen reader users cannot distinguish pages, and it harms SEO.  
**Fix:** Pass per-page titles via Svelte 5 `$props()` or use `$page.url` to set dynamic titles:
```svelte
<svelte:head>
  <title>PaperKit — {title || 'PDF Tools'}</title>
</svelte:head>
```

---

## 🟠 Moderate Issues

### M1. No meta description or OG tags (Professional Polish)
**File:** `src/routes/+layout.svelte` (no tags present)  
**Severity:** 🟠 Medium  
**Issue:** Site has no `<meta name="description">`, no Open Graph tags, no Twitter card tags. When shared on social media or displayed in search results, it shows bare links with no preview.  
**Fix:** Add to `<svelte:head>` in layout or per-page:
```svelte
<meta name="description" content="Split and merge PDFs in your browser. No uploads, no servers, privacy-first." />
<meta property="og:title" content="PaperKit" />
<meta property="og:description" content="PDF tools that stay on your device." />
```

### M2. No favicon rendered (Professional Polish)
**File:** `src/routes/+layout.svelte` (missing link); `src/lib/assets/favicon.svg` (is a Svelte logo, not brand)  
**Severity:** 🟠 Medium  
**Issue:** No `<link rel="icon">` in the document head. The SVG at `src/lib/assets/favicon.svg` exists but is unused, and is actually the Svelte logo — not a PaperKit brand asset.  
**Fix:** Create a proper PaperKit favicon (a document/paper icon) and add:
```svelte
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
```

### M3. Touch targets below 44px minimum (Mobile Responsiveness)
**Files:** `src/routes/split/+page.svelte:139-148`, `src/routes/merge/+page.svelte:96-108`  
**Severity:** 🟠 Medium  
**Issue:**  
- Page selection buttons in Split: `width: 40px; height: 40px` — **40px < 44px** WCAG minimum  
- Reorder/remove buttons in Merge: `width: 28px; height: 28px` — **28px << 44px**  
**Fix:** Increase to minimum 44×44px. For merge action buttons, ensure padding/layout accommodates larger targets without breaking.
```css
.page-btn { width: 44px; height: 44px; }
.actions button { width: 44px; height: 44px; padding: 8px; }
```

### M4. Disabled cards use `href="#"` with no `aria-disabled` (Accessibility)
**File:** `src/routes/+page.svelte:5-6`  
**Severity:** 🟠 Medium  
**Issue:** "Compress" and "Rotate" cards use `<a href="#">` with `class:disabled` and `cursor: not-allowed`. Hash links (`href="#"`) scroll to top when clicked even when visually disabled. No `aria-disabled="true"` on disabled cards. Screen readers will still treat them as links and may click them.  
**Fix:** Use `<a>` with no `href` or add `role="link" aria-disabled="true"` and prevent default on click:
```svelte
<a role="link" aria-disabled="true" tabindex="-1" class:disabled={!tool.available}>
```

### M5. "Soon" badge fails WCAG AA contrast (Visual/Accessibility)
**File:** `src/routes/+page.svelte:69-80`  
**Severity:** 🟠 Medium  
**Issue:** Badge `color: var(--text-secondary) (#64748b)` on `background: var(--border) (#e2e8f0)` yields a contrast ratio of **~3.86:1** — below the 4.5:1 WCAG AA minimum for 11px text. At 0.7rem (~11px), this is small text and hard to read, especially for visually impaired users.  
**Fix:** Darken the badge text or use a darker background:
```css
.badge { 
  color: #475569; /* slate-600 */
  background: #cbd5e1; /* slate-300 — better contrast */
}
```

### M6. Interactive elements lack `aria-label` (Accessibility)
**Files:** All pages  
**Severity:** 🟠 Medium  
**Issue:** 6 interactive elements on the page, **none** have `aria-label` attributes. While many have visible text labels, the reorder buttons (↑, ↓, ×) in Merge rely solely on `title` attributes which have inconsistent screen reader support. The "Remove" button in Split has no label at all.  
**Fix:** Add `aria-label` to icon-only buttons:
```svelte
<button onclick={() => removeFile(i)} aria-label="Remove {f.name}">×</button>
<button onclick={() => moveUp(i)} aria-label="Move {f.name} up">↑</button>
<button onclick={() => moveDown(i)} aria-label="Move {f.name} down">↓</button>
<button onclick={clearFile} class="btn-ghost" aria-label="Remove {file.name}">Remove</button>
```

### M7. No `aria-current="page"` on active nav link (Accessibility)
**File:** `src/routes/+layout.svelte:14-15`  
**Severity:** 🟠 Medium  
**Issue:** Nav links for Split and Merge have no `aria-current` attribute. Screen reader users cannot tell which page they are on.  
**Fix:** Use SvelteKit's `$page.url.pathname` to set `aria-current="page"` on the matching link.

---

## 🟡 Minor Issues

### m1. No media queries anywhere (Mobile Responsiveness)
**Files:** All CSS in all files  
**Severity:** 🟡 Low  
**Issue:** Zero media queries in the entire codebase. Layouts use `auto-fill` and `minmax` which provide basic responsiveness, but at 375px:
- Main content padding `1.5rem` per side leaves only ~327px content width  
- Hero H1 at `2.2rem` (~35px) is large for a 375px screen and causes tight word wrapping  
- `.tool-layout { max-width: 700px }` — no breakpoint adjustments for mobile  
**Fix:** Add a `@media (max-width: 640px)` breakpoint:
```css
@media (max-width: 640px) {
  main { padding: 1.5rem 1rem; }
  .hero h1 { font-size: 1.6rem; }
  .hero p { font-size: 0.95rem; }
  .tool-card { padding: 1rem; }
}
```

### m2. No loading spinner/indicator (UX Polish)
**Files:** `src/routes/split/+page.svelte:93-95`, `src/routes/merge/+page.svelte:59-61`  
**Severity:** 🟡 Low  
**Issue:** Processing state changes button text to "Processing..." / "Merging..." but there's no visual progress indicator (spinner, progress bar). For large PDFs, the browser freezes with just text changing — no visual feedback that work is happening.  
**Fix:** Add a CSS spinner or animated dots alongside the processing text:
```svelte
<button disabled={processing}>
  {#if processing}
    <span class="spinner"></span> Processing...
  {:else}
    Split PDF
  {/if}
</button>
```

### m3. No drag-and-drop file validation (Error States)
**File:** `src/lib/components/DropZone.svelte:13-15`  
**Severity:** 🟡 Low  
**Issue:** `handleDrop` accepts all dropped files regardless of type. The `accept` attribute only filters the file picker dialog — drag-and-drop can accept any file type. Invalid files silently pass to `onFiles`, causing unhandled errors downstream.  
**Fix:** Filter by file type in `handleDrop`:
```svelte
function handleDrop(e: DragEvent) {
  e.preventDefault();
  dragging = false;
  const pdfs = Array.from(e.dataTransfer?.files ?? []).filter(f => f.name.endsWith('.pdf'));
  if (pdfs.length > 0) onFiles(pdfs);
}
```

### m4. Fixed-height header doesn't wrap at narrow widths (Mobile)
**File:** `src/routes/+layout.svelte:36-42`  
**Severity:** 🟡 Low  
**Issue:** Nav sets `height: 56px` with `display: flex` and `justify-content: space-between`. At very narrow widths (< 320px), "PaperKit" + "Split Merge" may collide. No `flex-wrap` or `gap` relaxation.  
**Fix:** Add `flex-wrap: wrap` or a mobile nav breakpoint for smaller screens.

### m5. No reduced-motion support (Accessibility)
**File:** `src/routes/+page.svelte:56`  
**Severity:** 🟡 Low  
**Issue:** Cards have `transition: box-shadow 0.2s, transform 0.2s` with no `@media (prefers-reduced-motion)` fallback. Vestibular disorder users may experience discomfort.  
**Fix:**
```css
@media (prefers-reduced-motion: reduce) {
  .tool-card { transition: none; }
}
```

### m6. Hero illustration missing (Professional Polish)
**File:** `src/routes/+page.svelte:10-13`  
**Severity:** 🟡 Low  
**Issue:** Hero section is pure text — no icon, illustration, or visual anchor. Compared to ilovepdf.com and smallpdf.com which use branded hero illustrations, this feels bare. A simple document/PDF icon or abstract illustration would add visual weight.  
**Fix:** Add a hero illustration (SVG or emoji) or a subtle background pattern.

### m7. Footer "All processing happens in your browser" repeated from hero (Content)
**File:** `src/routes/+layout.svelte:23`  
**Severity:** 🟡 Low  
**Issue:** The footer repeats the same privacy message from the hero verbatim. Redundant and wastes space.  
**Fix:** Use the footer for secondary info (e.g., "Built with pdf-lib · Open source") or remove it.

### m8. Emoji icon in DropZone has no accessible label (Accessibility)
**File:** `src/lib/components/DropZone.svelte:43`  
**Severity:** 🟡 Low  
**Issue:** The 📄 emoji serves as a decorative icon but has no `role="img"` or `aria-label`. Screen readers may read "document emoji" or ignore it inconsistently.  
**Fix:** Wrap the emoji or add `aria-hidden="true"` for screen reader clarity:
```svelte
<span aria-hidden="true" class="icon">📄</span>
```

### m9. Range input labels not explicitly associated (Accessibility)
**File:** `src/routes/split/+page.svelte:88-89`  
**Severity:** 🟡 Low  
**Issue:** Range inputs use `<label>From: <input ... /></label>` pattern — implicit association works but is fragile. If the wrapping changes, association breaks.  
**Fix:** Use explicit `for`/`id` pairing:
```svelte
<label for="range-start">From:</label>
<input id="range-start" type="number" ... />
```

---

## ✅ Already Good

- **Clean, minimalist design** — restrained color palette, consistent spacing, professional typography
- **Privacy-first messaging** — prominent and repeated, builds trust
- **Auto-responsive card grid** — `auto-fill`/`minmax` adapts to viewport width without media queries
- **File-bar UI** on Split page — clean file info display after upload
- **Radio button mode selection** — clear, vertically stacked, accessible by default (label wrapping)
- **Consistent accent color** used across buttons, active states, hover interactions
- **Full-width primary buttons** — good for touch targets despite the height issue
- **Sticky header** — always accessible
- **Proper min-height calc** — footer stays at bottom

---

## Summary

| Severity | Count |
|----------|-------|
| 🔴 High | 4 |
| 🟠 Medium | 7 |
| 🟡 Low | 9 |
| **Total** | **20** |

**Priority fixes (quick wins with highest impact):**
1. Add keyboard handler to DropZone (C1)
2. Add global focus-visible styles (C2)
3. Wrap PDF load in try/catch with error UI (C3)
4. Dynamic page titles per route (C4)
5. Increase touch targets to 44px (M3)
6. Fix "Soon" badge contrast (M5)
7. Add a simple media query breakpoint (m1)
