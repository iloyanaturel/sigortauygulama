import { round2 } from "@/lib/money";
import { mergeSettings } from "@/lib/settings";
import { foldTurkish } from "@/lib/text";
import type { AppSettings, Policy } from "@/lib/types";

export function isTaliProducer(name: string | null | undefined, settings?: Partial<AppSettings> | null): boolean {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return false;
  const folded = foldTurkish(trimmed);
  return mergeSettings(settings).taliProducerNames.some((item) => foldTurkish(item) === folded);
}

export function splitCommission(
  totalCommission: number,
  producer: string | null | undefined,
  settings?: Partial<AppSettings> | null,
): { total: number; producerCommission: number; agencyCommission: number; tali: boolean } {
  const total = round2(Number(totalCommission) || 0);
  const merged = mergeSettings(settings);
  const tali = isTaliProducer(producer, merged);
  if (!tali) {
    return { total, producerCommission: 0, agencyCommission: total, tali: false };
  }
  const producerCommission = round2(total * merged.taliShareRate);
  return {
    total,
    producerCommission,
    agencyCommission: round2(total - producerCommission),
    tali: true,
  };
}

export function applyCommissionSplit(policy: Policy, settings?: Partial<AppSettings> | null): Policy {
  const split = splitCommission(policy.commission, policy.producer, settings);
  return {
    ...policy,
    producerCommission: split.producerCommission,
    agencyCommission: split.agencyCommission,
  };
}
