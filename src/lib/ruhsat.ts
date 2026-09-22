import { defaultEndDate, toISODate } from "@/lib/dates";
import { compactSpaces, extractTurkishPlate, foldTurkish, formatPlate, titleName } from "@/lib/text";
import type { ParsedPolicyDraft } from "@/lib/pdf-policy";

export function isRuhsatDocument(text: string): boolean {
  const folded = foldTurkish(text);
  if (
    folded.includes("SIGORTA POLICESI") ||
    folded.includes("TOPLAM NET PRIM") ||
    folded.includes("POLICE NO") ||
    folded.includes("NOTER") ||
    folded.includes("SATIS SOZLESMESI")
  ) {
    return false;
  }
  return (
    folded.includes("TESCIL BELGESI") ||
    folded.includes("MOTORLU ARAC TESCIL BELGESI") ||
    (folded.includes("RUHSAT") && folded.includes("PLAKA") && (folded.includes("SASI") || folded.includes("KIMLIK")))
  );
}

function labeled(text: string, labels: string[]): string {
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, String.raw`\s*`);
    const match = text.match(new RegExp(`${escaped}\\s*:?\\s*([^\\n]+)`, "i"));
    const value = compactSpaces(match?.[1] ?? "");
    if (value && foldTurkish(value) !== foldTurkish(label)) return value.replace(/[:.]$/, "");
  }
  return "";
}

function extractTckn(text: string): string {
  const collapsed = text.replace(/(\d)[\s.-]+(?=\d)/g, "$1");
  return collapsed.match(/\b([1-9]\d{10})\b/)?.[1] ?? "";
}

export function parseRuhsatFromText(rawText: string): ParsedPolicyDraft {
  const text = rawText.replace(/\u00a0/g, " ");
  const name =
    titleName(
      labeled(text, ["Adı Soyadı", "ADI SOYADI", "Ad Soyad", "Sahibi", "Araç Sahibi", "Unvanı"]),
    ) ||
    titleName(
      compactSpaces(text.match(/([A-ZÇĞİÖŞÜÂÎÛ]{2,}(?:\s+[A-ZÇĞİÖŞÜÂÎÛ]{2,}){1,4})/)?.[1] ?? ""),
    );
  const nationalId = extractTckn(text);
  const plate = formatPlate(labeled(text, ["Plaka", "PLAKA NO", "PLAKA"]) || extractTurkishPlate(text));
  const documentSerial = labeled(text, ["Belge Seri No", "BELGE SERİ NO", "Seri No", "Ruhsat No"]);
  const chassis = labeled(text, ["Şasi No", "ŞASİ NO", "Sasi No", "VIN"]);
  const motor = labeled(text, ["Motor No", "MOTOR NO"]);
  const address = labeled(text, ["Adres", "ADRESİ", "İKAMETGAH"]);
  const issueDate = toISODate(labeled(text, ["Tescil Tarihi", "TESCİL TARİHİ", "İlk Tescil"])) || "";
  const warnings: string[] = [];
  if (!name) warnings.push("Ruhsattan ad okunamadı.");
  if (!plate) warnings.push("Ruhsattan plaka okunamadı.");

  return {
    documentKind: "ruhsat",
    branch: "Trafik",
    partaj: "",
    customerName: name,
    nationalId,
    phone: "",
    birthDate: "",
    policyNo: "",
    plate,
    documentSerial,
    address,
    addressCode: "",
    daskNo: "",
    issueDate,
    startDate: issueDate,
    endDate: issueDate ? defaultEndDate(issueDate) : "",
    netPremium: null,
    grossPremium: null,
    giderVergisi: null,
    ghk: null,
    thgf: null,
    ysv: null,
    firePremium: null,
    compulsoryNet: null,
    chassisNo: chassis,
    motorNo: motor,
    status: "aktif",
    notes: ["Ruhsat", chassis && `Şasi: ${chassis}`, motor && `Motor: ${motor}`].filter(Boolean).join(" · "),
    warnings,
  };
}
