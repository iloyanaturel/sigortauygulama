import type { AppSettings } from "@/lib/types";

export const DEFAULT_TALI_NAMES = ["TAMER DİNÇ", "ŞENEL YILDIRIM"] as const;
export const DEFAULT_AGENCY_NAMES = ["NURDAN"] as const;

export const DEFAULT_SETTINGS: AppSettings = {
  agencyName: "Bolaman Sigorta",
  taliShareRate: 0.5,
  taliProducerNames: [...DEFAULT_TALI_NAMES],
  agencyProducerNames: [...DEFAULT_AGENCY_NAMES],
};

export function mergeSettings(raw?: Partial<AppSettings> | null): AppSettings {
  return {
    agencyName: raw?.agencyName || DEFAULT_SETTINGS.agencyName,
    pinHash: raw?.pinHash,
    taliShareRate:
      typeof raw?.taliShareRate === "number" && raw.taliShareRate >= 0 && raw.taliShareRate <= 1
        ? raw.taliShareRate
        : DEFAULT_SETTINGS.taliShareRate,
    taliProducerNames:
      raw?.taliProducerNames && raw.taliProducerNames.length > 0
        ? raw.taliProducerNames
        : DEFAULT_SETTINGS.taliProducerNames,
    agencyProducerNames:
      raw?.agencyProducerNames && raw.agencyProducerNames.length > 0
        ? raw.agencyProducerNames
        : DEFAULT_SETTINGS.agencyProducerNames,
  };
}
