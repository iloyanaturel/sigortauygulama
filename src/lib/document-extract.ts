import { isImageFile, isPdfFile, parseDocumentFromText } from "@/lib/document-parse";
import { extractPdfText } from "@/lib/pdf-extract";
import { recognizeImage } from "@/lib/ocr";
import type { ParsedPolicyDraft } from "@/lib/pdf-policy";

async function renderPdfPagesForOcr(data: ArrayBuffer, maxPages = 2): Promise<HTMLCanvasElement[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const task = pdfjs.getDocument({
    data: new Uint8Array(data),
    disableAutoFetch: true,
    disableStream: true,
    isEvalSupported: false,
  });
  const doc = await task.promise;
  const canvases: HTMLCanvasElement[] = [];
  const count = Math.min(doc.numPages, maxPages);
  for (let i = 1; i <= count; i += 1) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    await page.render({ canvasContext: ctx, viewport, canvas } as never).promise;
    canvases.push(canvas);
  }
  await doc.destroy();
  return canvases;
}

export async function extractTextFromFile(
  file: File,
  onProgress?: (ratio: number) => void,
): Promise<string> {
  if (isImageFile(file)) {
    return recognizeImage(file, onProgress);
  }
  if (isPdfFile(file)) {
    const buffer = await file.arrayBuffer();
    const digital = await extractPdfText(buffer);
    if (digital.replace(/\s/g, "").length >= 80) return digital;
    const pages = await renderPdfPagesForOcr(buffer);
    const parts: string[] = [];
    for (const [index, canvas] of pages.entries()) {
      parts.push(
        await recognizeImage(canvas, (ratio) => onProgress?.((index + ratio) / Math.max(pages.length, 1))),
      );
    }
    return [digital, ...parts].filter(Boolean).join("\n");
  }
  throw new Error("Desteklenmeyen dosya türü");
}

export async function parseUploadedFile(
  file: File,
  onProgress?: (ratio: number) => void,
): Promise<ParsedPolicyDraft> {
  const text = await extractTextFromFile(file, onProgress);
  return parseDocumentFromText(text);
}
