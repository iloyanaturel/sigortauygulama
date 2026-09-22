import { defaultEndDate, toISODate } from "@/lib/dates";
import { parseTRNumber } from "@/lib/money";
import { compactSpaces, extractTurkishPlate, foldTurkish, titleName } from "@/lib/text";
import type { ParsedPolicyDraft } from "@/lib/pdf-policy";

function buildFoldMap(text: string): { folded: string; map: number[] } {
  let folded = "";
  const map: number[] = [];
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const mapped = foldTurkish(ch);
    const token = mapped || (/\s/.test(ch) ? " " : "");
    if (!token) continue;
    if (token === " " && folded.endsWith(" ")) continue;
    map[folded.length] = i;
    folded += token;
  }
  return { folded, map };
}

function indexOfLabel(text: string, label: string, from = 0): number {
  const { folded, map } = buildFoldMap(text);
  const fromFolded = map.findIndex((orig, idx) => idx >= 0 && orig >= from);
  const idx = folded.indexOf(foldTurkish(label), fromFolded < 0 ? 0 : fromFolded);
  if (idx < 0) return -1;
  return map[idx] ?? -1;
}

export function isNotarySaleDocument(text: string): boolean {
  const folded = foldTurkish(text);
  const hasNoter = folded.includes("NOTER");
  const hasSale =
    folded.includes("SATIS SOZLESMESI") ||
    folded.includes("SATIS SENEDI") ||
    folded.includes("ARAC SATIS") ||
    folded.includes("TASIT SATIS") ||
    folded.includes("MOTORLU ARAC");
  const hasParties = folded.includes("SATICI") && folded.includes("ALICI");
  const hasPlate = folded.includes("PLAKA");
  return (hasNoter && (hasSale || hasParties)) || (hasSale && hasParties) || (hasNoter && hasPlate && hasParties);
}

function sliceSection(text: string, startLabels: string[], endLabels: string[]): string {
  let start = -1;
  for (const label of startLabels) {
    const idx = indexOfLabel(text, label);
    if (idx >= 0 && (start < 0 || idx < start)) start = idx;
  }
  if (start < 0) return "";
  let end = text.length;
  for (const label of endLabels) {
    const idx = indexOfLabel(text, label, start + 3);
    if (idx > start && idx < end) end = idx;
  }
  return text.slice(start, end);
}

function labeledLine(section: string, labels: string[]): string {
  for (const label of labels) {
    const idx = indexOfLabel(section, label);
    if (idx < 0) continue;
    const rest = section.slice(idx);
    const match = rest.match(/:\s*([^\n]+)/) ?? rest.match(/\n\s*([A-ZÇĞİÖŞÜ0-9][^\n]+)/i);
    const line = compactSpaces(match?.[1] ?? "");
    if (line && foldTurkish(line) !== foldTurkish(label)) return line.replace(/[:.]$/, "");
  }
  return "";
}

function extractNameFromSection(section: string): string {
  const labeled = labeledLine(section, ["Adı Soyadı", "ADI SOYADI", "Ad Soyad", "Unvanı", "Ünvanı"]);
  const caps = section.match(/([A-ZÇĞİÖŞÜÂÎÛ]{2,}(?:\s+[A-ZÇĞİÖŞÜÂÎÛ]{2,}){1,4})/);
  const raw = labeled || caps?.[1] || "";
  const candidate = titleName(compactSpaces(raw.replace(/T\.?C\.?.*$/i, "")));
  const folded = foldTurkish(candidate);
  if (!candidate || candidate.length < 5) return "";
  if (
    folded.includes("SATICI") ||
    folded.includes("ALICI") ||
    folded.includes("NOTER") ||
    folded.includes("ADRES") ||
    folded.includes("PLAKA") ||
    folded.includes("KIMLIK")
  ) {
    return "";
  }
  return candidate;
}

function extractTckn(section: string): string {
  const collapsed = section.replace(/(\d)[\s.-]+(?=\d)/g, "$1");
  const match = collapsed.match(/\b([1-9]\d{10})\b/);
  return match?.[1] ?? "";
}

function extractDate(text: string): string {
  const patterns = [
    /(?:SATI[ŞS]\s*TAR[İI]H[İI]|TESL[İI]M TAR[İI]H[İI]|D[ÜU]ZENLEME TAR[İI]H[İI]|[İI][ŞS]LEM TAR[İI]H[İI]|TAR[İI]H)\s*:?\s*(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/i,
    /\b(\d{1,2}[./-]\d{1,2}[./-]\d{4})\b/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const iso = toISODate(match?.[1]);
    if (iso) return iso;
  }
  return "";
}

export function parseNotarySaleFromText(rawText: string): ParsedPolicyDraft {
  const text = rawText.replace(/\u00a0/g, " ");
  const sellerSection = sliceSection(text, ["SATICI"], ["ALICI", "ARAÇ", "ARAC BILG", "PLAKA"]);
  const buyerSection = sliceSection(text, ["ALICI"], ["ARAÇ", "ARAC BILG", "PLAKA", "SATIŞ BEDEL", "SATIS BEDEL"]);
  const sellerName = extractNameFromSection(sellerSection) || extractNameFromSection(sliceSection(text, ["SATAN"], ["ALAN", "ALICI"]));
  const buyerName = extractNameFromSection(buyerSection) || extractNameFromSection(sliceSection(text, ["ALAN"], ["ARAÇ", "PLAKA"]));
  const sellerId = extractTckn(sellerSection);
  const buyerId = extractTckn(buyerSection);
  const plate = extractTurkishPlate(text);
  const saleDate = extractDate(text);
  const salePrice =
    parseTRNumber(labeledLine(text, ["Satış Bedeli", "SATIŞ BEDELİ", "Bedel"])) ??
    parseTRNumber(text.match(/(\d{1,3}(?:[.\s]\d{3})+(?:,\d{2})?)\s*(?:TL)?/i)?.[1] ?? "");
  const chassis = labeledLine(text, ["Şasi No", "ŞASİ NO", "Sasi No", "VIN"]);
  const motor = labeledLine(text, ["Motor No", "MOTOR NO"]);
  const yevmiye = labeledLine(text, ["Yevmiye No", "YEVMİYE NO"]);
  const warnings: string[] = [];
  if (!plate) warnings.push("Plaka noter belgesinden okunamadı.");
  if (!sellerName && !buyerName) warnings.push("Alıcı / satıcı adı okunamadı.");
  warnings.push("Noter satışında prim yoktur; poliçe primlerini kontrol edin.");

  const notes = [
    "Noter satış sözleşmesi",
    sellerName ? `Satıcı: ${sellerName}` : "",
    buyerName ? `Alıcı: ${buyerName}` : "",
    chassis ? `Şasi: ${chassis}` : "",
    motor ? `Motor: ${motor}` : "",
    salePrice ? `Satış bedeli: ${salePrice}` : "",
    yevmiye ? `Yevmiye: ${yevmiye}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    documentKind: "notary-sale",
    branch: "Trafik",
    partaj: "",
    customerName: buyerName || sellerName,
    sellerName,
    buyerName,
    sellerNationalId: sellerId,
    buyerNationalId: buyerId,
    nationalId: buyerId || sellerId,
    phone: "",
    birthDate: "",
    policyNo: yevmiye,
    plate,
    documentSerial: yevmiye,
    addressCode: "",
    daskNo: "",
    issueDate: saleDate,
    startDate: saleDate,
    endDate: saleDate ? defaultEndDate(saleDate) : "",
    netPremium: null,
    grossPremium: null,
    giderVergisi: null,
    ghk: null,
    thgf: null,
    ysv: null,
    firePremium: null,
    compulsoryNet: null,
    salePrice: salePrice ?? null,
    chassisNo: chassis,
    motorNo: motor,
    status: "aktif",
    notes,
    warnings,
  };
}

export function notaryPartyForMode(
  draft: ParsedPolicyDraft,
  mode: "new" | "cancel",
): { name: string; nationalId: string } {
  if (mode === "cancel") {
    return {
      name: draft.sellerName || draft.customerName,
      nationalId: draft.sellerNationalId || draft.nationalId,
    };
  }
  return {
    name: draft.buyerName || draft.customerName,
    nationalId: draft.buyerNationalId || draft.nationalId,
  };
}
