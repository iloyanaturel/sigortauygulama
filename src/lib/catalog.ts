import { foldTurkish } from "@/lib/text";
import type { BranchItem, CalcProfile, CatalogItem } from "@/lib/types";

export const DEFAULT_PARTAJS: Array<Omit<CatalogItem, "id">> = [
  "QUICK",
  "SOMPO",
  "HEPİYİ",
  "DOĞA",
  "UNICO",
  "UNICO-OVİ",
  "KORU",
  "KORU-OVİ",
  "HDI-OVİ",
  "AXA-OVİ",
  "AXA-KURT",
  "ZURICH-OVİ",
  "RAY-OVİ",
  "ALLIANZ",
  "ANADOLU-AYF GRUP",
  "ANADOLU-GÜNEŞ",
  "TÜRKİYE",
  "TÜRKİYE-OVİ",
  "TÜRKİYE KATILIM",
  "AK SİGORTA",
  "AK-OVİ",
  "MAPFRE-OVİ",
  "NEOVA-OVİ",
  "ANKARA-OVİ",
  "CORPUS",
  "EMAA-TARAKÇI",
  "MAGDEBURGER-OVİ",
].map((name) => ({ name, usageCount: 0, active: true }));

export const DEFAULT_BRANCHES: Array<Omit<BranchItem, "id">> = [
  { name: "Trafik", profile: "trafik", defaultCommissionRate: 0.1, usageCount: 0, active: true },
  { name: "Kasko", profile: "kasko", defaultCommissionRate: 0.15, usageCount: 0, active: true },
  { name: "Genişletilmiş Kasko", profile: "kasko", defaultCommissionRate: 0.15, usageCount: 0, active: true },
  { name: "Eko Kasko", profile: "kasko", defaultCommissionRate: 0.1, usageCount: 0, active: true },
  { name: "Mini Kasko", profile: "kasko", defaultCommissionRate: 0.1, usageCount: 0, active: true },
  { name: "Kaskonomiq", profile: "kasko", defaultCommissionRate: 0.05, usageCount: 0, active: true },
  { name: "DASK", profile: "exempt", defaultCommissionRate: 0.1, usageCount: 0, active: true },
  { name: "Konut", profile: "konut", defaultCommissionRate: 0.25, usageCount: 0, active: true },
  { name: "İMM", profile: "kasko", defaultCommissionRate: 0.1, usageCount: 0, active: true },
  { name: "Yeşil Kart", profile: "kasko", defaultCommissionRate: 0.1, usageCount: 0, active: true },
  { name: "TSS", profile: "exempt", defaultCommissionRate: 0, usageCount: 0, active: true },
  { name: "Seyahat Sağlık", profile: "exempt", defaultCommissionRate: 0, usageCount: 0, active: true },
  { name: "Tekne", profile: "kasko", defaultCommissionRate: 0.15, usageCount: 0, active: true },
];

export const DEFAULT_PRODUCERS: Array<Omit<CatalogItem, "id">> = [
  "NURDAN",
  "TAMER DİNÇ",
  "ŞENEL YILDIRIM",
  "YİĞİTHAN",
  "GÜNEŞ",
  "KALIPSAN",
  "HAKAN OYUNCAKCI",
  "NURDAN THY",
].map((name) => ({ name, usageCount: 0, active: true }));

const PARTAJ_ALIASES: Record<string, string> = {
  QUICK: "QUICK",
  "QUICK SIGORTA": "QUICK",
  "QUICK SIGORTA A.S.": "QUICK",
  OUICK: "QUICK",
  SOMPO: "SOMPO",
  "SOMPO JAPAN": "SOMPO",
  "SOMPO JAPAN SIGORTA A.S": "SOMPO",
  "SOMPO OVI": "SOMPO",
  "SOMPO- GUNES": "SOMPO-GÜNEŞ",
  "SOMPO-GUNES": "SOMPO-GÜNEŞ",
  HEPIYI: "HEPİYİ",
  "HEPIYI SIGORTA A.S.": "HEPİYİ",
  DOGA: "DOĞA",
  "DOGA SIGORTA A.S": "DOĞA",
  "DOGA- OVI": "DOĞA-OVİ",
  "DOGA-OVI": "DOĞA-OVİ",
  UNICO: "UNICO",
  "UNICO SIGORTA A.S.": "UNICO",
  "UNICO-OVI": "UNICO-OVİ",
  "UNICO - OVI": "UNICO-OVİ",
  "UNICO OVI": "UNICO-OVİ",
  "UNICO / OVI": "UNICO-OVİ",
  KORU: "KORU",
  "KORU-OVI": "KORU-OVİ",
  "OVI - KORU": "KORU-OVİ",
  "KORU- MERVE TARAKCI": "KORU-TARAKÇI",
  "KORU-TARAKCI": "KORU-TARAKÇI",
  "HDI-OVI": "HDI-OVİ",
  "HDI - OVI": "HDI-OVİ",
  "HDI SIGORTA A.S": "HDI",
  "HDI / GUNES SIGORTA": "HDI-GÜNEŞ",
  "HDI - GUNES SIGORTA": "HDI-GÜNEŞ",
  "HDI- GUNES": "HDI-GÜNEŞ",
  "AXA-OVI": "AXA-OVİ",
  "AXA- OVI": "AXA-OVİ",
  "AXA / OVI": "AXA-OVİ",
  "AXA - KURT": "AXA-KURT",
  "AXA- KURT": "AXA-KURT",
  "AXA- DILBAZ": "AXA-DİLBAZ",
  "ZURICH-OVI": "ZURICH-OVİ",
  "ZURICH- OVI": "ZURICH-OVİ",
  "ZURICH OVI": "ZURICH-OVİ",
  "ZURICH-TARAKCI": "ZURICH-TARAKÇI",
  "ZURICH-MERVE T": "ZURICH-TARAKÇI",
  "RAY-OVI": "RAY-OVİ",
  "RAY - OVI": "RAY-OVİ",
  "RAY / OVI": "RAY-OVİ",
  "RAY SIGORTA A.S": "RAY",
  ALLIANZ: "ALLIANZ",
  "ALLIANZ SIGORTA A.S": "ALLIANZ",
  "ALLIANZ- OVI": "ALLIANZ-OVİ",
  "ANADOLU-AYF GRUP": "ANADOLU-AYF GRUP",
  "ANADOLU/ AYF GRUP": "ANADOLU-AYF GRUP",
  "ANADOLU- GUNES": "ANADOLU-GÜNEŞ",
  "ANADOLU -GUNES": "ANADOLU-GÜNEŞ",
  TURKIYE: "TÜRKİYE",
  "TURKIYE SIGORTA A.S": "TÜRKİYE",
  "TURKIYE-OVI": "TÜRKİYE-OVİ",
  "TURKIYE- OVI": "TÜRKİYE-OVİ",
  "TURKIYE KATILIM": "TÜRKİYE KATILIM",
  "TURKIYE KATILIM- OVI": "TÜRKİYE KATILIM",
  "AK SIGORTA": "AK SİGORTA",
  "AK SIGORTA A.S.": "AK SİGORTA",
  "AK-OVI": "AK-OVİ",
  "MAPFRE-OVI": "MAPFRE-OVİ",
  "MAPFRE- OVI": "MAPFRE-OVİ",
  "MAPFRE / OVI BROKER": "MAPFRE-OVİ",
  "MAPFRE SIGORTA A.S.-SAMSUN SUBE": "MAPFRE-OVİ",
  MAPHRE: "MAPFRE",
  "MAPHRE-OVI": "MAPFRE-OVİ",
  "NEOVA-OVI": "NEOVA-OVİ",
  "ANKARA OVI": "ANKARA-OVİ",
  "ANKARA- OVI": "ANKARA-OVİ",
  "ANKARA - OVI": "ANKARA-OVİ",
  "ANKARA SIGORTA A.S": "ANKARA",
  CORPUS: "CORPUS",
  "CORPUS SIGORTA A.S.": "CORPUS",
  "CORPUS OVI": "CORPUS-OVİ",
  "EMAA- TARAKCI": "EMAA-TARAKÇI",
  "MAGDEBURGER/OVI": "MAGDEBURGER-OVİ",
};

const BRANCH_ALIASES: Record<string, string> = {
  TRAFIK: "Trafik",
  TRAF: "Trafik",
  "TRAFIK IPTAL": "Trafik",
  "TRAFIK IPTAKL": "Trafik",
  KASKO: "Kasko",
  "GENISLETILMIS KASKO": "Genişletilmiş Kasko",
  "EKO KASKO": "Eko Kasko",
  "MINI KASKO": "Mini Kasko",
  KASKONOMIQ: "Kaskonomiq",
  KASKONOMIK: "Kaskonomiq",
  DASK: "DASK",
  "DASK D.20": "DASK",
  "DASK D.19": "DASK",
  "DASK D.18": "DASK",
  "DASK D.15": "DASK",
  KONUT: "Konut",
  IMM: "İMM",
  "YESIL KART": "Yeşil Kart",
  TSS: "TSS",
  TAMAMLAYICI: "TSS",
  SEYAHAT: "Seyahat Sağlık",
  "SEYAHAT SAGLIK": "Seyahat Sağlık",
  TEKNE: "Tekne",
};

const PRODUCER_ALIASES: Record<string, string> = {
  NURDAN: "NURDAN",
  TAMER: "TAMER DİNÇ",
  "TAMER DINC": "TAMER DİNÇ",
  "SENEL YILDIRIM": "ŞENEL YILDIRIM",
  "SENOL YILDIRIM": "ŞENEL YILDIRIM",
  SENOL: "ŞENEL YILDIRIM",
  YIGITHAN: "YİĞİTHAN",
  "YIGITHAN DINC": "YİĞİTHAN",
  GUNES: "GÜNEŞ",
  "GUNES S,GORTA": "GÜNEŞ",
  KALIPSAN: "KALIPSAN",
  "HAKAN OYUNCAKCI": "HAKAN OYUNCAKCI",
  "OYUNCAKCI HAKAN": "HAKAN OYUNCAKCI",
  HAKAN: "HAKAN OYUNCAKCI",
  "NURDAN THY": "NURDAN THY",
  "NURDAN-THY": "NURDAN THY",
};

function canon(raw: string): string {
  return foldTurkish(raw)
    .replace(/[.]/g, "")
    .replace(/\s*\/\s*/g, "/")
    .replace(/\s*-\s*/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function lookup(map: Record<string, string>, raw: string): string | null {
  const folded = canon(raw);
  if (!folded) return null;
  for (const [key, value] of Object.entries(map)) {
    if (canon(key) === folded || canon(key).replace(/\s/g, "") === folded.replace(/\s/g, "")) {
      return value;
    }
  }
  return null;
}

export function normalizePartaj(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^[\d.,\-\s]+$/.test(trimmed)) return null;
  if (/^\d{1,2}[./]\d{1,2}[./]\d{2,4}$/.test(trimmed)) return null;
  const aliased = lookup(PARTAJ_ALIASES, trimmed);
  if (aliased) return aliased;
  const folded = foldTurkish(trimmed);
  if (
    folded.includes("MUSTERI") ||
    folded.includes("SIGORTALI") ||
    folded.includes("TARIHI") ||
    folded.includes("VADE") ||
    folded.includes("BITIS") ||
    folded.includes("KOMISYON") ||
    folded === "PARTAJ"
  ) {
    return null;
  }
  return trimmed.replace(/\s+/g, " ").trim().toLocaleUpperCase("tr-TR");
}

export function normalizeBranch(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^[\d.,\-]+$/.test(trimmed.replace(/\s/g, ""))) return null;
  const aliased = lookup(BRANCH_ALIASES, trimmed);
  if (aliased) return aliased;
  const folded = foldTurkish(trimmed);
  if (folded.includes("IPTAL") && folded.includes("TRAFIK")) return "Trafik";
  if (DEFAULT_BRANCHES.some((b) => foldTurkish(b.name) === folded)) {
    return DEFAULT_BRANCHES.find((b) => foldTurkish(b.name) === folded)!.name;
  }
  return null;
}

export function normalizeProducer(raw: string | null | undefined): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "?" || trimmed === "???") return "";
  if (/^\d/.test(trimmed) && /[./]/.test(trimmed)) return "";
  if (/^\d+$/.test(trimmed)) return "";
  const aliased = lookup(PRODUCER_ALIASES, trimmed);
  if (aliased) return aliased;
  const folded = foldTurkish(trimmed);
  if (folded.includes("DOGUM") || folded.includes("TARIHI") || folded.startsWith("U ")) return "";
  return trimmed.replace(/\s+/g, " ").trim().toLocaleUpperCase("tr-TR");
}

export function profileForBranch(name: string, branches: Array<{ name: string; profile: CalcProfile }> = DEFAULT_BRANCHES): CalcProfile {
  const found = branches.find((b) => foldTurkish(b.name) === foldTurkish(name));
  if (found) return found.profile;
  const folded = foldTurkish(name);
  if (folded.includes("TRAFIK")) return "trafik";
  if (folded.includes("KONUT") || folded.includes("YANGIN")) return "konut";
  if (folded.includes("DASK") || folded.includes("TSS") || folded.includes("SAGLIK") || folded.includes("SEYAHAT")) {
    return "exempt";
  }
  return "kasko";
}

export function defaultCommissionForBranch(
  name: string,
  branches: Array<{ name: string; defaultCommissionRate: number }> = DEFAULT_BRANCHES,
): number {
  return branches.find((b) => foldTurkish(b.name) === foldTurkish(name))?.defaultCommissionRate ?? 0.1;
}

export function isVehicleBranch(name: string): boolean {
  const folded = foldTurkish(name);
  return (
    folded.includes("TRAFIK") ||
    folded.includes("KASKO") ||
    folded.includes("IMM") ||
    folded.includes("YESIL") ||
    folded.includes("TEKNE")
  );
}

export function isPropertyBranch(name: string): boolean {
  const folded = foldTurkish(name);
  return folded.includes("DASK") || folded.includes("KONUT");
}
