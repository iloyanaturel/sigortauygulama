import { parsePolicyFromText, type ParsedPolicyDraft } from "@/lib/pdf-policy";
import { isNotarySaleDocument, parseNotarySaleFromText } from "@/lib/notary-sale";

export function parseDocumentFromText(text: string): ParsedPolicyDraft {
  if (isNotarySaleDocument(text)) return parseNotarySaleFromText(text);
  return parsePolicyFromText(text);
}

export function isImageFile(file: Pick<File, "name" | "type">): boolean {
  const name = file.name.toLowerCase();
  return (
    file.type.startsWith("image/") ||
    /\.(jpe?g|png|webp|gif|bmp|tif{1,2}|heic|heif)$/.test(name)
  );
}

export function isPdfFile(file: Pick<File, "name" | "type">): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}
