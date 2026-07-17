# PaperKit — Feature Roadmap

Features that are planned but require additional libraries or significant effort.

## Conversion Tools

| Feature | Status | Notes |
|---------|--------|-------|
| **PDF → Images** | Planned | Render PDF pages to PNG/JPG using pdf.js + Canvas. Each page becomes a downloadable image. |
| **Images → PDF** | Planned | Combine multiple JPG/PNG images into a single PDF. Sortable before conversion. |
| **PDF → Text** | Planned | Extract text content from PDF pages using pdf.js text layer. |
| **HTML → PDF** | Planned | Convert a web page or HTML snippet to PDF. Needs a layout engine (e.g. html2canvas or browser print). |

## Metadata & Forms

| Feature | Status | Notes |
|---------|--------|-------|
| **Metadata Editor** | ✅ Done | View and edit PDF metadata: title, author, subject, keywords. pdf-lib supports `setTitle()`, `setAuthor()`, etc. |
| **Form Fill** | Planned | Fill PDF form fields (text inputs, checkboxes, dropdowns). pdf-lib has full form support via `getForm()`. |
| **Form Creator** | Planned | Add new form fields to a PDF. More complex — requires field positioning UI. |

## Signing

| Feature | Status | Notes |
|---------|--------|-------|
| **Draw Signature** | Planned | Draw a signature on a canvas and place it on a PDF page. Requires signature drawing UI + `page.drawImage()` for embedding. |
| **Upload Signature** | Planned | Upload an image (PNG with transparency) and place it as a signature. Needs `page.drawImage()` with `PDFImage`. |
| **Text Signature** | Planned | Type a name and render it in a handwriting-style font as a signature. |

## Security

| Feature | Status | Notes |
|---------|--------|-------|
| **Password Protect** | Blocked | pdf-lib does not support native PDF encryption. Requires pdf.js or another library with AES-128/256 encryption support. |
| **Remove Password** | Blocked | Same limitation — pdf-lib cannot decrypt password-protected PDFs. |
| **Redact** | Planned | Draw opaque black rectangles over sensitive areas. Technically doable with pdf-lib's `drawRectangle()`. |

## Advanced Editing

| Feature | Status | Notes |
|---------|--------|-------|
| **Compress** | Blocked | pdf-lib has limited compression. Real compression requires re-encoding streams — needs pdf.js or a WASM-based encoder. |
| **OCR Text Recognition** | Blocked | Requires Tesseract.js (WASM, ~10MB). Possible as client-side but performance-heavy. |
| **Compare PDFs** | Planned | Side-by-side visual diff. Needs pdf.js for rendering + canvas comparison. |
