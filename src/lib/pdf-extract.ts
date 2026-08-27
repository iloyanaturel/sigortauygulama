import { parsePolicyFromText, type ParsedPolicyDraft } from "@/lib/pdf-policy";

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
  const max = Math.min(doc.numPages, 4);
  const pages: string[] = [];
  for (let i = 1; i <= max; i += 1) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const line = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .filter(Boolean)
      .join(" ");
    pages.push(line);
  }
  await doc.destroy();
  return pages.join("\n");
}

export async function parsePolicyPdf(data: ArrayBuffer): Promise<ParsedPolicyDraft> {
  const text = await extractPdfText(data);
  return parsePolicyFromText(text);
}
