# PaperKit

**Client-side PDF toolkit — 13 tools. Zero uploads.**

[![Live Demo](https://img.shields.io/badge/demo-paperkit.netlify.app-6366f1)](https://paperkit.netlify.app)
[![Tech](https://img.shields.io/badge/built%20with-SvelteKit%205%20%2B%20pdf.js%20%2B%20pdf--lib-ff3e00)](https://github.com/tedhermes/paperkit)

All processing happens in your browser. No files leave your device.

## Tools

| Category | Tools |
|----------|-------|
| **Page Management** | Split, Merge, Reorder, Remove, Extract, Crop, Rotate |
| **Content** | Watermark, Page Numbers, Add Text |
| **Security** | Protect, Unlock |
| **More** | Compress |

## Highlights

- **Page previews** — pdf.js renders real page thumbnails for Reorder, Remove, Extract, Split
- **Visual editors** — Canvas-based crop tool with drag handles, click-to-place text placement
- **Live previews** — See watermark and page numbers on the first page before processing
- **Privacy-first** — No server, no tracking, no CDN. Everything runs locally via WebAssembly

## Tech Stack

- [SvelteKit 5](https://kit.svelte.dev/) (adapter-static)
- [pdf-lib](https://github.com/Hopding/pdf-lib) — PDF manipulation
- [pdf.js](https://github.com/mozilla/pdf.js) — Page rendering
- [Netlify](https://netlify.com) — Static hosting

## Run Locally

```bash
git clone https://github.com/tedhermes/paperkit.git
cd paperkit
npm install
npm run dev
```

## License

MIT
