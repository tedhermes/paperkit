import { PDFDocument, rgb, StandardFonts, PDFPage } from 'pdf-lib';

export const MAX_PDF_SIZE = 100 * 1024 * 1024; // 100 MB

export function validateFileSize(file: File): string | null {
  if (file.size > MAX_PDF_SIZE) {
    return `File "${file.name}" is too large. Maximum size is 100 MB.`;
  }
  return null;
}

// ─── Core Utilities ───────────────────────────────────────────────

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function downloadBlob(data: Uint8Array, filename: string) {
  const safe = sanitizeFilename(filename);
  const blob = new Blob([data], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = safe;
  a.click();
  URL.revokeObjectURL(url);
}

async function loadPDFDoc(file: File): Promise<PDFDocument> {
  const buf = await file.arrayBuffer();
  return PDFDocument.load(buf);
}

// ─── Split & Merge (existing) ─────────────────────────────────────

export async function splitPDF(
  file: File,
  pageRanges: { start: number; end: number }[]
): Promise<Uint8Array[]> {
  const srcDoc = await loadPDFDoc(file);
  const results: Uint8Array[] = [];

  for (const range of pageRanges) {
    const newDoc = await PDFDocument.create();
    const indices = Array.from(
      { length: range.end - range.start + 1 },
      (_, i) => range.start - 1 + i
    );
    const pages = await newDoc.copyPages(srcDoc, indices);
    pages.forEach((p) => newDoc.addPage(p));
    results.push(await newDoc.save());
  }

  return results;
}

export async function mergePDFs(files: File[]): Promise<Uint8Array> {
  const mergedDoc = await PDFDocument.create();

  for (const file of files) {
    const srcDoc = await loadPDFDoc(file);
    const pages = await mergedDoc.copyPages(srcDoc, srcDoc.getPageIndices());
    pages.forEach((p) => mergedDoc.addPage(p));
  }

  return await mergedDoc.save();
}

// ─── Page Management ──────────────────────────────────────────────

/** Reorder pages: newOrder is 1-based page numbers in desired order */
export async function reorderPages(
  file: File,
  newOrder: number[]
): Promise<Uint8Array> {
  const srcDoc = await loadPDFDoc(file);
  const newDoc = await PDFDocument.create();
  const indices = newOrder.map((n) => n - 1);
  const pages = await newDoc.copyPages(srcDoc, indices);
  pages.forEach((p) => newDoc.addPage(p));
  return await newDoc.save();
}

/** Remove pages: pageNums are 1-based */
export async function removePages(
  file: File,
  pageNums: number[]
): Promise<Uint8Array> {
  const srcDoc = await loadPDFDoc(file);
  const removeSet = new Set(pageNums);
  const newDoc = await PDFDocument.create();

  for (let i = 1; i <= srcDoc.getPageCount(); i++) {
    if (!removeSet.has(i)) {
      const [page] = await newDoc.copyPages(srcDoc, [i - 1]);
      newDoc.addPage(page);
    }
  }

  return await newDoc.save();
}

/** Extract pages into a single new PDF */
export async function extractPages(
  file: File,
  pageNums: number[]
): Promise<Uint8Array> {
  const srcDoc = await loadPDFDoc(file);
  const newDoc = await PDFDocument.create();
  const indices = pageNums.map((n) => n - 1);
  const pages = await newDoc.copyPages(srcDoc, indices);
  pages.forEach((p) => newDoc.addPage(p));
  return await newDoc.save();
}

/** Crop a page by setting its visible box. Coordinates from top-left. */
export async function cropPage(
  file: File,
  pageNum: number,
  crop: { x: number; y: number; width: number; height: number }
): Promise<Uint8Array> {
  const srcDoc = await loadPDFDoc(file);
  const page = srcDoc.getPage(pageNum - 1);
  const { width, height } = page.getSize();

  // pdf-lib cropBox: bottom-left origin
  page.setCropBox(
    crop.x,
    height - crop.y - crop.height,
    crop.width,
    crop.height
  );

  return await srcDoc.save();
}

// ─── Security ─────────────────────────────────────────────────────

/**
 * NOTE: pdf-lib does not support native PDF encryption/decryption.
 * These are placeholders for future implementation with a different library
 * such as pdfjs-dist or a WebAssembly-based solution.
 */

export async function protectPDF(
  _file: File,
  _userPassword?: string,
  _ownerPassword?: string
): Promise<Uint8Array> {
  throw new Error(
    'Password protection is not yet available. This feature requires a different PDF library and is on the roadmap.'
  );
}

export async function unlockPDF(
  _file: File,
  _password?: string
): Promise<Uint8Array> {
  throw new Error(
    'PDF unlocking is not yet available. This feature requires a different PDF library and is on the roadmap.'
  );
}

// ─── Watermark ────────────────────────────────────────────────────

export interface WatermarkOptions {
  text: string;
  opacity?: number;   // 0–1, default 0.15
  fontSize?: number;  // default 48
  color?: [number, number, number]; // RGB 0–1, default gray
  rotation?: number;  // degrees, default -45
}

export async function addWatermark(
  file: File,
  options: WatermarkOptions
): Promise<Uint8Array> {
  const srcDoc = await loadPDFDoc(file);
  const font = await srcDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = srcDoc.getPages();
  const {
    text,
    opacity = 0.15,
    fontSize = 48,
    color = [0, 0, 0],
    rotation = -45,
  } = options;

  const radians = (rotation * Math.PI) / 180;

  for (const page of pages) {
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    const textHeight = fontSize;

    // Tile watermark across the page
    const stepX = textWidth * 2.5;
    const stepY = textHeight * 3;

    for (let y = -textHeight; y < height + textHeight; y += stepY) {
      for (let x = -textWidth; x < width + textWidth; x += stepX) {
        page.drawText(text, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(color[0], color[1], color[2]),
          opacity,
          rotate: { type: 0 as const, angle: radians },
        });
      }
    }
  }

  return await srcDoc.save();
}

// ─── Page Numbers ─────────────────────────────────────────────────

export interface PageNumberOptions {
  format?: string;      // '{page}/{total}', default '{page}'
  fontSize?: number;    // default 12
  position?: 'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-center';
  startAt?: number;     // default 1
  margin?: number;      // default 40
}

export async function addPageNumbers(
  file: File,
  options: PageNumberOptions = {}
): Promise<Uint8Array> {
  const srcDoc = await loadPDFDoc(file);
  const font = await srcDoc.embedFont(StandardFonts.Helvetica);
  const pages = srcDoc.getPages();
  const total = pages.length;
  const {
    format = '{page}',
    fontSize = 12,
    position = 'bottom-center',
    startAt = 1,
    margin = 40,
  } = options;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const { width } = page.getSize();
    const label = format
      .replace('{page}', String(i + startAt))
      .replace('{total}', String(total));

    const textWidth = font.widthOfTextAtSize(label, fontSize);
    let x: number;

    if (position === 'bottom-center' || position === 'top-center') {
      x = (width - textWidth) / 2;
    } else if (position === 'bottom-right') {
      x = margin;
    } else {
      x = margin;
    }

    const y = position.startsWith('top') ? page.getSize().height - margin : margin;

    page.drawText(label, { x, y, size: fontSize, font, color: rgb(0.3, 0.3, 0.3) });
  }

  return await srcDoc.save();
}

// ─── Add Text ─────────────────────────────────────────────────────

export interface AddTextOptions {
  x: number;
  y: number;
  fontSize?: number;   // default 14
  color?: [number, number, number]; // default black
  fontFamily?: 'helvetica' | 'helvetica-bold' | 'times' | 'courier';
}

export async function addTextToPage(
  file: File,
  pageNum: number,
  text: string,
  options: AddTextOptions
): Promise<Uint8Array> {
  const srcDoc = await loadPDFDoc(file);
  const fontMap: Record<string, StandardFonts> = {
    helvetica: StandardFonts.Helvetica,
    'helvetica-bold': StandardFonts.HelveticaBold,
    times: StandardFonts.TimesRoman,
    courier: StandardFonts.Courier,
  };
  const font = await srcDoc.embedFont(
    fontMap[options.fontFamily || 'helvetica']
  );
  const page = srcDoc.getPage(pageNum - 1);
  const { height } = page.getSize();
  const {
    fontSize = 14,
    color = [0, 0, 0],
  } = options;

  page.drawText(text, {
    x: options.x,
    y: height - options.y - fontSize,
    size: fontSize,
    font,
    color: rgb(color[0], color[1], color[2]),
  });

  return await srcDoc.save();
}

// ─── Redact ───────────────────────────────────────────────────────

export interface RedactionRect {
  x: number;       // PDF points, from top-left
  y: number;
  width: number;
  height: number;
}

/** Redact pages by drawing black rectangles over sensitive areas */
export async function redactPDF(
  file: File,
  pageNums: number[],
  rects: RedactionRect[]
): Promise<Uint8Array> {
  const srcDoc = await loadPDFDoc(file);

  for (const num of pageNums) {
    const page = srcDoc.getPage(num - 1);
    const pageHeight = page.getSize().height;

    for (const rect of rects) {
      // Convert from top-left (user coordinates) to bottom-left (PDF coordinates)
      const pdfY = pageHeight - rect.y - rect.height;

      page.drawRectangle({
        x: rect.x,
        y: pdfY,
        width: rect.width,
        height: rect.height,
        color: rgb(0, 0, 0),
      });
    }
  }

  return await srcDoc.save();
}

// ─── Compress (placeholder) ───────────────────────────────────────

export async function compressPDF(_file: File): Promise<Uint8Array> {
  throw new Error(
    'Compression is on the roadmap. pdf-lib has limited compression support.'
  );
}

// ─── Metadata ─────────────────────────────────────────────────────

export interface PDFMetadata {
  title: string;
  author: string;
  subject: string;
  keywords: string;
  producer: string;
  creator: string;
}

export async function readMetadata(file: File): Promise<PDFMetadata> {
  const srcDoc = await loadPDFDoc(file);
  return {
    title: srcDoc.getTitle() ?? '',
    author: srcDoc.getAuthor() ?? '',
    subject: srcDoc.getSubject() ?? '',
    keywords: srcDoc.getKeywords() ?? '',
    producer: srcDoc.getProducer() ?? '',
    creator: srcDoc.getCreator() ?? '',
  };
}

export async function editMetadata(
  file: File,
  updates: { title?: string; author?: string; subject?: string; keywords?: string }
): Promise<Uint8Array> {
  const srcDoc = await loadPDFDoc(file);
  if (updates.title !== undefined) srcDoc.setTitle(updates.title);
  if (updates.author !== undefined) srcDoc.setAuthor(updates.author);
  if (updates.subject !== undefined) srcDoc.setSubject(updates.subject);
  if (updates.keywords !== undefined) srcDoc.setKeywords(updates.keywords);
  srcDoc.setModificationDate(new Date());
  return await srcDoc.save();
}

// ─── Rotate ───────────────────────────────────────────────────────

export async function rotatePages(
  file: File,
  pageNums: number[],
  angle: 90 | 180 | 270
): Promise<Uint8Array> {
  const srcDoc = await loadPDFDoc(file);
  for (const num of pageNums) {
    const page = srcDoc.getPage(num - 1);
    page.setRotation(page.getRotation().angle + angle);
  }
  return await srcDoc.save();
}
