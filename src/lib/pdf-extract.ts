import { parsePolicyFromText, type ParsedPolicyDraft } from "@/lib/pdf-policy";

type TextItem = { str: string; x: number; y: number };

function itemsToText(items: Array<{ str?: string; transform?: number[] }>): string {
  const rows: TextItem[] = items
    .filter((item) => item.str)
    .map((item) => ({
      str: item.str ?? "",
      x: item.transform?.[4] ?? 0,
      y: Math.round(item.transform?.[5] ?? 0),
    }));
  rows.sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: string[] = [];
  let currentY: number | null = null;
  let current: string[] = [];
  for (const row of rows) {
    if (currentY !== null && Math.abs(row.y - currentY) > 3) {
      lines.push(current.join(" ").trim());
      current = [];
    }
    currentY = row.y;
    current.push(row.str);
  }
  if (current.length) lines.push(current.join(" ").trim());
  return lines.filter(Boolean).join("\n");
}

export async function extractPdfText(data: ArrayBuffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const task = pdfjs.getDocument({
    data: new Uint8Array(data),
    disableAutoFetch: true,
    disableStream: true,
    isEvalSupported: false,
  });
  const doc = await task.promise;
  const max = Math.min(doc.numPages, 6);
  const pages: string[] = [];
  for (let i = 1; i <= max; i += 1) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(itemsToText(content.items as Array<{ str?: string; transform?: number[] }>));
  }
  await doc.destroy();
  return pages.join("\n");
}

export async function parsePolicyPdf(data: ArrayBuffer): Promise<ParsedPolicyDraft> {
  const text = await extractPdfText(data);
  return parsePolicyFromText(text);
}
