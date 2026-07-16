import { PDFDocument } from 'pdf-lib';

export async function splitPDF(
  file: File,
  pageRanges: { start: number; end: number }[]
): Promise<Uint8Array[]> {
  const buf = await file.arrayBuffer();
  const srcDoc = await PDFDocument.load(buf);
  const results: Uint8Array[] = [];

  for (const range of pageRanges) {
    const newDoc = await PDFDocument.create();
    const pages = await newDoc.copyPages(
      srcDoc,
      Array.from({ length: range.end - range.start + 1 }, (_, i) => range.start - 1 + i)
    );
    pages.forEach((p) => newDoc.addPage(p));
    results.push(await newDoc.save());
  }

  return results;
}

export async function mergePDFs(files: File[]): Promise<Uint8Array> {
  const mergedDoc = await PDFDocument.create();

  for (const file of files) {
    const buf = await file.arrayBuffer();
    const srcDoc = await PDFDocument.load(buf);
    const pages = await mergedDoc.copyPages(srcDoc, srcDoc.getPageIndices());
    pages.forEach((p) => mergedDoc.addPage(p));
  }

  return await mergedDoc.save();
}

export function downloadBlob(data: Uint8Array, filename: string) {
  const blob = new Blob([data], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
