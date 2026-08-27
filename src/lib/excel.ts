import * as XLSX from "xlsx";
import {
  defaultCommissionForBranch,
  normalizeBranch,
  normalizePartaj,
  normalizeProducer,
  profileForBranch,
} from "@/lib/catalog";
import { defaultEndDate, toISODate, todayISO } from "@/lib/dates";
import { parseTRNumber, round2 } from "@/lib/money";
import { calculatePremium, suggestedCommission } from "@/lib/premiums";
import { uid } from "@/lib/id";
import { foldTurkish, titleName } from "@/lib/text";
import { applyCommissionSplit } from "@/lib/commission";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import type { Policy } from "@/lib/types";

type ColMap = Partial<
  Record<
    | "tarih"
    | "policeTarihi"
    | "musteri"
    | "partaj"
    | "policeNo"
    | "brans"
    | "plaka"
    | "tc"
    | "belgeSeriNo"
    | "netPrim"
    | "brutPrim"
    | "komisyon"
    | "tali"
    | "tel"
    | "dogumTarihi"
    | "iptalTarihi"
    | "iptalNedeni"
    | "durum",
    number
  >
>;

const HEADER_ALIASES: Record<string, keyof ColMap> = {
  TARIH: "tarih",
  "POLICE TARIHI": "policeTarihi",
  "POLICE TARIHI ": "policeTarihi",
  "MUSTERI ADI": "musteri",
  MUSTERI: "musteri",
  PARTAJ: "partaj",
  "POLICE NO": "policeNo",
  "BRANS ADI": "brans",
  BRANS: "brans",
  PLAKA: "plaka",
  TC: "tc",
  TCKN: "tc",
  "BELGE SERI NO": "belgeSeriNo",
  "NET PRIM": "netPrim",
  "BRUT PRIM": "brutPrim",
  KOMISYON: "komisyon",
  "TALI BILGILERI": "tali",
  TALI: "tali",
  TEL: "tel",
  TELEFON: "tel",
  "DOGUM TARIHI": "dogumTarihi",
  "IPTAL TARIHI": "iptalTarihi",
  "IPTAL NEDENI": "iptalNedeni",
  DURUM: "durum",
};

function headerKey(value: unknown): string {
  return foldTurkish(String(value ?? ""))
    .replace(/[:]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function detectHeader(row: unknown[]): ColMap | null {
  const map: ColMap = {};
  row.forEach((cell, index) => {
    const key = HEADER_ALIASES[headerKey(cell)];
    if (key) map[key] = index;
  });
  if (map.partaj !== undefined && (map.musteri !== undefined || map.brans !== undefined)) {
    return map;
  }
  return null;
}

function cell(row: unknown[], map: ColMap, key: keyof ColMap): unknown {
  const idx = map[key];
  if (idx === undefined) return undefined;
  return row[idx];
}

function str(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return toISODate(value) ?? "";
  return String(value).replace(/^:+/, "").trim();
}

function looksLikeAddress(value: string): boolean {
  const folded = foldTurkish(value);
  return folded.includes("AD KO") || folded.includes("ADRES") || folded.includes("AK:");
}

function looksLikeDaskNo(value: string): boolean {
  const folded = foldTurkish(value);
  return folded.includes("PO NO") || folded.includes("DASK NO") || folded.includes("POLICE NO");
}

export type ImportRowResult = {
  policy: Policy;
  warnings: string[];
};

export type ImportParseResult = {
  policies: ImportRowResult[];
  skipped: number;
  sheets: string[];
};

export function parseWorkbook(data: ArrayBuffer | Uint8Array): ImportParseResult {
  const wb = XLSX.read(data, { type: "array", cellDates: true });
  const policies: ImportRowResult[] = [];
  let skipped = 0;

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<(unknown | undefined)[]>(sheet, {
      header: 1,
      raw: true,
      defval: null,
      blankrows: false,
    });
    let map: ColMap | null = null;
    for (const row of rows) {
      if (!row || row.every((v) => v === null || v === undefined || String(v).trim() === "")) {
        continue;
      }
      const maybeHeader = detectHeader(row);
      if (maybeHeader) {
        map = maybeHeader;
        continue;
      }
      if (!map) continue;
      const parsed = parseRow(row, map, sheetName);
      if (!parsed) {
        skipped += 1;
        continue;
      }
      policies.push(parsed);
    }
  }

  return { policies, skipped, sheets: wb.SheetNames };
}

function parseRow(row: unknown[], map: ColMap, sheetName: string): ImportRowResult | null {
  const warnings: string[] = [];
  const customer = titleName(str(cell(row, map, "musteri")));
  const partaj = normalizePartaj(str(cell(row, map, "partaj")));
  const branch = normalizeBranch(str(cell(row, map, "brans")));
  const policyNo = str(cell(row, map, "policeNo")).replace(/^:+/, "");
  if (!partaj || !branch || (!customer && !policyNo)) return null;

  const net = parseTRNumber(cell(row, map, "netPrim")) ?? 0;
  const grossRaw = parseTRNumber(cell(row, map, "brutPrim"));
  const commissionRaw = parseTRNumber(cell(row, map, "komisyon"));
  const issueDate = toISODate(cell(row, map, "tarih")) ?? todayISO();
  const startDate = toISODate(cell(row, map, "policeTarihi")) ?? issueDate;
  const plateRaw = str(cell(row, map, "plaka"));
  const serialRaw = str(cell(row, map, "belgeSeriNo"));
  const tcRaw = str(cell(row, map, "tc"));

  let plate = "";
  let addressCode = "";
  let daskNo = "";
  let documentSerial = serialRaw;
  const nationalId = tcRaw.replace(/\D/g, "").slice(0, 11);

  if (looksLikeAddress(plateRaw)) {
    addressCode = plateRaw.replace(/.*?:/, "").trim();
  } else if (looksLikeDaskNo(plateRaw)) {
    daskNo = plateRaw.replace(/.*?:/, "").trim();
  } else if (/^\d{6,}$/.test(plateRaw.replace(/\s/g, "")) && branch === "DASK") {
    daskNo = plateRaw;
  } else {
    plate = plateRaw.toLocaleUpperCase("tr-TR");
  }

  if (looksLikeAddress(serialRaw)) {
    addressCode = serialRaw.replace(/.*?:/, "").trim();
    documentSerial = "";
  } else if (looksLikeDaskNo(serialRaw)) {
    daskNo = serialRaw.replace(/.*?:/, "").trim();
    documentSerial = "";
  }

  const profile = profileForBranch(branch);
  const calc = calculatePremium({ profile, netPremium: net });
  const rate = defaultCommissionForBranch(branch);
  const commission = commissionRaw ?? suggestedCommission(net, rate);
  const commissionRate = net !== 0 ? round2(commission / net) : rate;
  const statusCell = foldTurkish(str(cell(row, map, "durum")));
  const cancelled =
    statusCell === "IPTAL" ||
    foldTurkish(branch).includes("IPTAL") ||
    foldTurkish(policyNo).includes("IPTAL") ||
    foldTurkish(serialRaw).includes("IPTAL") ||
    net < 0 ||
    (grossRaw ?? 0) < 0;

  if (grossRaw !== null && Math.abs(grossRaw - calc.grossPremium) > 2) {
    warnings.push("Excel brüt primi hesaplanan tutardan farklı; Excel tutarı korundu.");
  }

  const now = new Date().toISOString();
  const policy: Policy = {
    id: uid(),
    createdAt: now,
    updatedAt: now,
    issueDate,
    startDate,
    endDate: defaultEndDate(startDate),
    customerName: customer,
    nationalId,
    phone: str(cell(row, map, "tel")),
    birthDate: toISODate(cell(row, map, "dogumTarihi")) ?? "",
    partaj,
    branch,
    policyNo,
    plate,
    documentSerial,
    addressCode,
    daskNo,
    netPremium: net,
    compulsoryNet: profile === "trafik" ? net : null,
    firePremium: null,
    ghk: calc.ghk,
    thgf: calc.thgf,
    giderVergisi: calc.giderVergisi,
    ysv: calc.ysv,
    grossPremium: grossRaw ?? calc.grossPremium,
    commission,
    commissionRate,
    producerCommission: 0,
    agencyCommission: 0,
    producer: normalizeProducer(str(cell(row, map, "tali"))),
    notes: sheetName,
    status: cancelled ? "iptal" : "aktif",
    cancelDate: toISODate(cell(row, map, "iptalTarihi")) ?? "",
    cancelReason: str(cell(row, map, "iptalNedeni")),
    sourceSheet: sheetName,
  };

  return { policy: applyCommissionSplit(policy, DEFAULT_SETTINGS), warnings };
}

const POLICY_HEADER = [
  "TARİH",
  "POLİÇE TARİHİ",
  "VADE BİTİŞ",
  "MÜŞTERİ ADI",
  "PARTAJ",
  "POLİÇE NO",
  "BRANŞ ADI",
  "PLAKA",
  "TC",
  "BELGE SERİ NO",
  "ADRES KODU",
  "DASK NO",
  "NET PRİM",
  "G.H.K. PAYI",
  "GİDER VERGİSİ",
  "T.H.G. FONU",
  "Y.S.V.",
  "BRÜT PRİM",
  "KOMİSYON",
  "TALİ KOMİSYONU",
  "ACENTE KOMİSYONU",
  "TALİ",
  "TEL",
  "DOĞUM TARİHİ",
  "DURUM",
  "İPTAL TARİHİ",
  "İPTAL NEDENİ",
];

function policyRow(p: Policy) {
  return [
    p.issueDate,
    p.startDate,
    p.endDate,
    p.customerName,
    p.partaj,
    p.policyNo,
    p.branch,
    p.plate,
    p.nationalId,
    p.documentSerial,
    p.addressCode,
    p.daskNo,
    p.netPremium,
    p.ghk,
    p.giderVergisi,
    p.thgf,
    p.ysv,
    p.grossPremium,
    p.commission,
    p.producerCommission ?? 0,
    p.agencyCommission ?? 0,
    p.producer,
    p.phone,
    p.birthDate,
    p.status,
    p.cancelDate ?? "",
    p.cancelReason ?? "",
  ];
}

export function policiesToWorkbook(policies: Policy[]): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  const active = policies.filter((p) => p.status !== "iptal");
  const cancelled = policies.filter((p) => p.status === "iptal");
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([POLICY_HEADER, ...active.map(policyRow)]),
    "Poliçeler",
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([POLICY_HEADER, ...cancelled.map(policyRow)]),
    "İptal",
  );
  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}

export function emptyPolicyTemplate(kind: "aktif" | "iptal"): ArrayBuffer {
  const example =
    kind === "iptal"
      ? [
          "2026-08-27",
          "2026-08-27",
          "2027-08-27",
          "Örnek Müşteri",
          "QUICK",
          "123456789",
          "Trafik",
          "34 ABC 123",
          "",
          "",
          "",
          "",
          -1000,
          0,
          0,
          0,
          0,
          -1000,
          -100,
          -50,
          -50,
          "TAMER DİNÇ",
          "",
          "",
          "iptal",
          "2026-08-27",
          "Müşteri talebi",
        ]
      : [];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(example.length ? [POLICY_HEADER, example] : [POLICY_HEADER]),
    kind === "iptal" ? "İptal" : "Poliçeler",
  );
  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}
