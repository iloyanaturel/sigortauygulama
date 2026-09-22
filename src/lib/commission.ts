import { round2 } from "@/lib/money";
import { mergeSettings } from "@/lib/settings";
import { foldTurkish } from "@/lib/text";
import type { AppSettings, CatalogItem, Policy } from "@/lib/types";

export function producerShareRate(
  name: string | null | undefined,
  settings?: Partial<AppSettings> | null,
  producers: CatalogItem[] = [],
): number {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return 0;
  const folded = foldTurkish(trimmed);
  const row = producers.find((item) => foldTurkish(item.name) === folded);
  if (row?.role === "agency") return 0;
  if (row?.role === "tali") {
    const rate = row.taliShareRate;
    if (typeof rate === "number" && rate >= 0 && rate <= 1) return rate;
    return mergeSettings(settings).taliShareRate;
  }
  if (isTaliProducer(trimmed, settings, producers)) return mergeSettings(settings).taliShareRate;
  return 0;
}

export function isTaliProducer(
  name: string | null | undefined,
  settings?: Partial<AppSettings> | null,
  producers: CatalogItem[] = [],
): boolean {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return false;
  const folded = foldTurkish(trimmed);
  const row = producers.find((item) => foldTurkish(item.name) === folded);
  if (row?.role === "tali") return true;
  if (row?.role === "agency") return false;
  return mergeSettings(settings).taliProducerNames.some((item) => foldTurkish(item) === folded);
}

export function splitCommission(
  totalCommission: number,
  producer: string | null | undefined,
  settings?: Partial<AppSettings> | null,
  producers: CatalogItem[] = [],
): { total: number; producerCommission: number; agencyCommission: number; tali: boolean } {
  const total = round2(Number(totalCommission) || 0);
  const share = producerShareRate(producer, settings, producers);
  if (share <= 0) {
    return { total, producerCommission: 0, agencyCommission: total, tali: false };
  }
  const producerCommission = round2(total * share);
  return {
    total,
    producerCommission,
    agencyCommission: round2(total - producerCommission),
    tali: true,
  };
}

export function applyCommissionSplit(
  policy: Policy,
  settings?: Partial<AppSettings> | null,
  producers: CatalogItem[] = [],
): Policy {
  const split = splitCommission(policy.commission, policy.producer, settings, producers);
  return {
    ...policy,
    producerCommission: split.producerCommission,
    agencyCommission: split.agencyCommission,
  };
}
