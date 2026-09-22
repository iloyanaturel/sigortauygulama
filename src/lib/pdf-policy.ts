import { defaultEndDate, toISODate } from "@/lib/dates";
import { parseTRNumber } from "@/lib/money";
import { normalizeBranch, normalizePartaj } from "@/lib/catalog";
import { compactSpaces, extractTurkishPlate, foldTurkish, titleName } from "@/lib/text";
import type { PolicyStatus } from "@/lib/types";

export type ParsedPolicyDraft = {
  documentKind?: "policy" | "notary-sale" | "ruhsat";
  branch: string;
  partaj: string;
  customerName: string;
  sellerName?: string;
  buyerName?: string;
  sellerNationalId?: string;
  buyerNationalId?: string;
  nationalId: string;
  phone: string;
  birthDate: string;
  policyNo: string;
  plate: string;
  documentSerial: string;
  address?: string;
  addressCode: string;
  daskNo: string;
  issueDate: string;
  startDate: string;
  endDate: string;
  netPremium: number | null;
  grossPremium: number | null;
  giderVergisi: number | null;
  ghk: number | null;
  thgf: number | null;
  ysv: number | null;
  firePremium: number | null;
  compulsoryNet: number | null;
  salePrice?: number | null;
  chassisNo?: string;
  motorNo?: string;
  status: PolicyStatus;
  notes: string;
  warnings: string[];
};

const AMOUNT = String.raw`(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})`;

function labeledAmount(text: string, labels: string[], side: "after" | "before" | "both" = "both"): number | null {
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, String.raw`\s*`);
    const after = new RegExp(`${escaped}[ \\t]*:?[ \\t\\n]*${AMOUNT}\\s*(?:TL)?`, "i");
    const before = new RegExp(`${AMOUNT}\\s*(?:TL)?\\s*:?\\s*${escaped}`, "i");
    const match =
      side === "before" ? text.match(before) : side === "after" ? text.match(after) : text.match(after) ?? text.match(before);
    if (match) {
      const value = parseTRNumber(match[1]);
      if (value !== null) return value;
    }
  }
  return null;
}

function toDate(raw: string | undefined): string {
  if (!raw) return "";
  const cleaned = raw.replace(/^0(?=\d{1,2}[./])/, "");
  return toISODate(cleaned) ?? "";
}

function firstDate(text: string, patterns: RegExp[], group = 1): string {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const iso = toDate(match[group] ?? match[1]);
    if (iso) return iso;
  }
  return "";
}

function extractDates(text: string, branch: string): { issueDate: string; startDate: string; endDate: string } {
  const range = text.match(
    /S[İI]GORTANIN BA[ŞS]LANGI[ÇC] VE B[İI]T[İI]M[İI][\s\S]{0,240}?(\d{1,2}[./]\d{1,2}[./]\d{4})\s*[-–]\s*(\d{1,2}[./]\d{1,2}[./]\d{4})/i,
  );
  if (range) {
    return { issueDate: toDate(range[1]), startDate: toDate(range[1]), endDate: toDate(range[2]) };
  }

  if (branch === "Konut") {
    const header = text.match(/(\d{1,2}[./]\d{1,2}[./]\d{4})00\s+(\d{1,2}[./]\d{1,2}[./]\d{4})/);
    if (header) {
      const endDate = toDate(header[1]);
      const startDate = toDate(header[2]);
      return { issueDate: startDate, startDate, endDate };
    }
  }

  const issueDate = firstDate(text, [
    /TANZ[İI]M TAR[İI]H[İI][^0-9]{0,24}0?(\d{1,2}[./]\d{1,2}[./]\d{4})/i,
    /Tanzim Tarihi\s*:?\s*(\d{1,2}[./]\d{1,2}[./]\d{4})/i,
  ]);
  const startDate =
    firstDate(text, [
      /POL[İI][ÇC]E BA[ŞS]LANGI[ÇC] TAR[İI]H[İI][\s\S]{0,80}?0?(\d{1,2}[./]\d{1,2}[./]\d{4})/i,
      /Ba[şs]lang[ıi]ç Tarihi\s*:?\s*(\d{1,2}[./]\d{1,2}[./]\d{4})/i,
    ]) || issueDate;
  const endDate =
    firstDate(text, [
      /POL[İI][ÇC]E B[İI]T[İI][ŞS] TAR[İI]H[İI][\s\S]{0,80}?(\d{1,2}[./]\d{1,2}[./]\d{4})/i,
      /Biti[şs] Tarihi\s*:?\s*(\d{1,2}[./]\d{1,2}[./]\d{4})/i,
    ]) || (startDate ? defaultEndDate(startDate) : "");

  return { issueDate: issueDate || startDate, startDate, endDate };
}

function extractPremiums(text: string, branch: string) {
  const kaskoBlock = text.match(
    new RegExp(
      `${AMOUNT}\\s*TL\\s*G[İI]DER VERG[İI]S[İI]\\s*:\\s*${AMOUNT}[\\s\\S]{0,80}?TOPLAM PR[İI]M\\s*:\\s*${AMOUNT}`,
      "i",
    ),
  );
  const netPremium =
    labeledAmount(text, ["TOPLAM NET PRİM"], "before") ??
    labeledAmount(text, ["Poliçe Primi", "POLİÇE PRİMİ"], "after") ??
    labeledAmount(text, ["NET PRİM"], "after") ??
    labeledAmount(text, ["Toplam Prim"], "after") ??
    (kaskoBlock ? parseTRNumber(kaskoBlock[1]) : null);
  const giderVergisi =
    labeledAmount(text, ["GİDER VERGİSİ"]) ?? (kaskoBlock ? parseTRNumber(kaskoBlock[2]) : null);
  const ghk = labeledAmount(text, ["G.H.K. PAYI", "G.H.K PAYI", "GHK PAYI"]);
  const thgf = labeledAmount(text, ["T.H.G. FONU", "THGF", "T.H.G FONU"]);
  const ysv = labeledAmount(text, ["Y.S.V.", "YSV"]);
  const grossPremium =
    labeledAmount(text, ["ÖDENECEK TOPLAM PRİM", "TOPLAM BRÜT PRİM", "BRÜT PRİM", "Toplam Brüt Prim"]) ??
    (kaskoBlock ? parseTRNumber(kaskoBlock[3]) : null) ??
    (branch === "DASK" || branch === "TSS" ? netPremium : null);
  const firePremium = ysv !== null && ysv > 0 ? parseTRNumber((ysv / 0.1).toFixed(2)) : null;
  const compulsoryNet =
    branch === "Trafik" && ghk !== null && ghk > 0 ? parseTRNumber((ghk / 0.02).toFixed(2)) : null;
  return { netPremium, giderVergisi, ghk, thgf, ysv, grossPremium, firePremium, compulsoryNet };
}

function detectBranch(text: string): string {
  const folded = foldTurkish(text);
  if (folded.includes("TAMAMLAYICI SAGLIK")) return "TSS";
  if (folded.includes("PRIME KONUT") || folded.includes("KONUT SIGORTA POLICESI")) return "Konut";
  if (folded.includes("ZORUNLU DEPREM") || folded.includes("DASK POLICE NO")) return "DASK";
  if (folded.includes("GENISLETILMIS KASKO")) return "Genişletilmiş Kasko";
  if (folded.includes("ZORUNLU MALI SORUMLULUK") || folded.includes("TRAFIK") && folded.includes("SIGORTA POLICESI")) {
    return "Trafik";
  }
  if (folded.includes("SEYAHAT SAGLIK") || folded.includes("SEYAHAT SAGLIK SIGORTA")) return "Seyahat Sağlık";
  if (folded.includes("KASKO")) return "Kasko";
  if (folded.includes("TRAFIK")) return "Trafik";
  return "";
}

function detectPartaj(text: string): string {
  const folded = foldTurkish(text);
  const companies: Array<[string, string]> = [
    ["QUICK SIGORTA", "QUICK"],
    ["SOMPO SIGORTA", "SOMPO"],
    ["SOMPO", "SOMPO"],
    ["HEPIYI", "HEPİYİ"],
    ["ALLIANZ", "ALLIANZ"],
    ["AXA", "AXA"],
    ["HDI SIGORTA", "HDI"],
    ["ZURICH", "ZURICH"],
    ["RAY SIGORTA", "RAY"],
    ["ANADOLU", "ANADOLU"],
    ["TURKIYE SIGORTA", "TÜRKİYE"],
    ["AK SIGORTA", "AK SİGORTA"],
    ["MAPFRE", "MAPFRE"],
    ["NEOVA", "NEOVA"],
    ["DOGA SIGORTA", "DOĞA"],
    ["UNICO", "UNICO"],
    ["KORU SIGORTA", "KORU"],
    ["CORPUS", "CORPUS"],
  ];
  for (const [needle, name] of companies) {
    if (folded.includes(needle)) return normalizePartaj(name) ?? name;
  }
  return "";
}

function extractName(text: string): string {
  const konutName = text.match(
    /Sigortalı Adı Soyadı\s*\/\s*Ünvanı[\s\S]{0,220}?([A-ZÇĞİÖŞÜÂÎÛ]{3,}(?:\s+[A-ZÇĞİÖŞÜÂÎÛ]{2,})+)/,
  );
  if (konutName?.[1] && !foldTurkish(konutName[1]).includes("ADRES")) {
    return titleName(compactSpaces(konutName[1]));
  }
  const patterns = [
    /Adı Soyadı\/Unvanı\s*:?\s*([A-ZÇĞİÖŞÜÂÎÛa-zçğıöşüâîû ]{3,80})/i,
    /ADI\/ÜNVANI\s*:?\s*([A-ZÇĞİÖŞÜÂÎÛa-zçğıöşüâîû ]{3,80})/i,
    /ADI SOYADI\s*\/\s*ÜNVANI[\s:]*([A-ZÇĞİÖŞÜÂÎÛa-zçğıöşüâîû ]{3,80})/i,
    /Sigortal[ıi]\s*:?\s*([A-ZÇĞİÖŞÜÂÎÛa-zçğıöşüâîû ]{5,80})/i,
  ];
  const haystacks = [insuredSlice(text), text];
  for (const haystack of haystacks) {
    for (const pattern of patterns) {
      const matches = haystack.matchAll(new RegExp(pattern, "gi"));
      for (const match of matches) {
        const candidate = titleName(compactSpaces(match[1] ?? "").replace(/\s+Ad[ıi]$/i, ""));
        const folded = foldTurkish(candidate);
        if (!candidate || candidate.length < 5) continue;
        if (
          folded.includes("SIGORTA") ||
          folded.includes("ACENTE") ||
          folded.includes("UNVANI") ||
          folded.includes("ADRESI") ||
          folded.includes("SOZLESME")
        ) {
          continue;
        }
        if (folded === "NURDAN BOLAMAN" && !foldTurkish(text).includes("TAMAMLAYICI SAGLIK")) {
          continue;
        }
        return candidate;
      }
    }
  }
  return "";
}

function extractPolicyNo(text: string, branch: string): { policyNo: string; daskNo: string } {
  const cleaned = text.replace(/ÖNCEK[İI]\s*POL[İI][ÇC]E\s*NO\s*:?\s*\d+/gi, "");
  const daskMatch = cleaned.match(/DASK\s*Poli[çc]e\s*No\s*:?\s*(\d{6,})/i);
  const daskNo = daskMatch?.[1] ?? "";
  const companyMatch =
    cleaned.match(/Sigorta Şirketi Poli[çc]e No\s*:?\s*(\d{6,})/i) ??
    cleaned.match(/Poli[çc]e Seri No\s*:?\s*[A-Z]-?\d+\/(\d{8,})/i) ??
    cleaned.match(/POL[İI][ÇC]E\s*NO\s*:?\s*0?(\d{8,})/i);
  let policyNo = companyMatch?.[1] ?? "";
  if (!policyNo) {
    const long = cleaned.match(/\b0?(\d{12,18})\b/);
    policyNo = long?.[1]?.replace(/^0+/, "") ?? "";
  }
  if (branch === "DASK" && daskNo && !policyNo) policyNo = daskNo;
  return { policyNo, daskNo };
}

function extractPlate(text: string): string {
  const labeled = text.match(/PLAKA\s*NO\s*:?\s*([0-9]{2,3}\s*[A-ZÇĞİÖŞÜ]{1,4}\s*[0-9]{2,4})/i);
  if (labeled?.[1]) return compactSpaces(labeled[1]).toLocaleUpperCase("tr-TR");
  return extractTurkishPlate(text);
}

function extractAddressCode(text: string): string {
  const dask = text.match(/Adres Kodu\s*:?\s*(\d{6,})/i);
  if (dask) return dask[1];
  const ak = text.match(/\bAK\s+(\d{6,})\b/i);
  return ak?.[1] ?? "";
}

function labeledValue(text: string, labels: string[]): string {
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, String.raw`\s*`);
    const match = text.match(new RegExp(`${escaped}\\s*:?\\s*([^\\n]+)`, "i"));
    const value = compactSpaces(match?.[1] ?? "");
    if (value && foldTurkish(value) !== foldTurkish(label) && !/^[\-*]+$/.test(value)) return value;
  }
  return "";
}

function insuredSlice(text: string): string {
  const folded = foldTurkish(text);
  const start = folded.indexOf("SIGORTALI");
  if (start < 0) return text.slice(0, 1800);
  const endCandidates = ["SIGORTA TEMINAT", "MARKA", "RISK BILG", "PRIME KONUT", "GENISLETILMIS"];
  let end = Math.min(text.length, start + 1400);
  for (const label of endCandidates) {
    const idx = folded.indexOf(label, start + 8);
    if (idx > start && idx < end) end = idx;
  }
  return text.slice(start, end);
}

function extractAddress(text: string): string {
  const slice = insuredSlice(text);
  const match = slice.match(/ADRES[İI]\s*:?\s*([^\n]+(?:\n[^\n]{5,90}){0,3})/i);
  const raw = compactSpaces((match?.[1] ?? "").replace(/\s+/g, " "));
  const folded = foldTurkish(raw);
  if (!raw || raw.length < 8) return "";
  if (folded.includes("QUICK TOWER") || folded.includes("SOMPO SIGORTA") || folded.includes("ICERENKOY MAH. UMUT")) {
    return "";
  }
  return raw.replace(/\s*ADRES[İI].*$/i, "").slice(0, 220);
}

function extractDocumentSerial(text: string): string {
  return labeledValue(text, ["Poliçe Seri No", "POLİÇE SERİ NO", "Belge Seri No"]);
}

function extractChassis(text: string): string {
  return labeledValue(text, ["Şasi No", "ŞASİ NO", "Sasi No"]).replace(/\s+/g, "");
}

function extractMotor(text: string): string {
  return labeledValue(text, ["Motor No", "MOTOR NO"]).replace(/\s+/g, "");
}

function extractNationalId(text: string): string {
  const slice = insuredSlice(text);
  const labeled = slice.match(/T\.?C\.?\s*K[İI]ML[İI]K\s*NO\s*:?\s*([0-9*]{5,14})/i);
  const digits = (labeled?.[1] ?? "").replace(/\D/g, "");
  if (digits.length === 11) return digits;
  const full = slice.match(/\b([1-9]\d{10})\b/);
  return full?.[1] ?? "";
}

function extractBirthDate(text: string): string {
  return firstDate(text, [/DO[ĞG]UM TAR[İI]H[İI]\s*:?\s*(\d{1,2}[./]\d{1,2}[./]\d{4})/i]);
}

function extractPhone(text: string): string {
  const slice = insuredSlice(text);
  const cep = slice.match(/(?:Cep Telefonu|GSM)\s*:?\s*(\(?0?\d{3}\)?[\s.-]?\d{2,3}[\s.-]?\d{2}[\s.-]?\d{2})/i);
  if (cep?.[1] && !cep[1].includes("*")) return cep[1];
  return "";
}

export function parsePolicyFromText(rawText: string): ParsedPolicyDraft {
  const text = rawText.replace(/\u00a0/g, " ");
  const folded = foldTurkish(text);
  const warnings: string[] = [];
  const branch = detectBranch(text);
  const partaj = detectPartaj(text);
  const { policyNo, daskNo } = extractPolicyNo(text, branch);
  const customerName = extractName(text);
  const plate = extractPlate(text);
  const addressCode = extractAddressCode(text);
  const address = extractAddress(text);
  const nationalId = extractNationalId(text);
  const birthDate = extractBirthDate(text);
  const phone = extractPhone(text);
  const documentSerial = extractDocumentSerial(text);
  const chassisNo = extractChassis(text);
  const motorNo = extractMotor(text);
  const status: PolicyStatus = folded.includes("IPTAL POLICE") || folded.includes("IPTALNAME") ? "iptal" : "aktif";
  const { issueDate, startDate, endDate } = extractDates(text, branch);
  const { netPremium, giderVergisi, ghk, thgf, ysv, grossPremium, firePremium, compulsoryNet } =
    extractPremiums(text, branch);

  if (!customerName) warnings.push("Müşteri adı PDF’den okunamadı.");
  if (!policyNo) warnings.push("Poliçe numarası PDF’den okunamadı.");
  if (!netPremium) warnings.push("Net prim PDF’den okunamadı.");
  if (!branch) warnings.push("Branş tespit edilemedi.");
  if (!partaj) warnings.push("Partaj / şirket tespit edilemedi.");

  return {
    branch: normalizeBranch(branch) ?? branch,
    partaj,
    customerName,
    nationalId,
    phone,
    birthDate,
    policyNo,
    plate,
    documentSerial,
    address,
    addressCode,
    daskNo,
    issueDate,
    startDate,
    endDate,
    netPremium,
    grossPremium,
    giderVergisi,
    ghk,
    thgf,
    ysv,
    firePremium,
    compulsoryNet,
    chassisNo,
    motorNo,
    status,
    notes: "",
    warnings,
    documentKind: "policy",
  };
}
