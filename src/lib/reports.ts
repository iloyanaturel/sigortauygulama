import type { Policy, ReportFilters } from "@/lib/types";
import { round2 } from "@/lib/money";
import { monthKey } from "@/lib/dates";

export type Totals = {
  count: number;
  netPremium: number;
  ghk: number;
  giderVergisi: number;
  thgf: number;
  ysv: number;
  grossPremium: number;
  commission: number;
  producerCommission: number;
  agencyCommission: number;
};

export const EMPTY_FILTERS: ReportFilters = {
  from: "",
  to: "",
  partaj: "",
  branch: "",
  producer: "",
  status: "aktif",
};

export function emptyTotals(): Totals {
  return {
    count: 0,
    netPremium: 0,
    ghk: 0,
    giderVergisi: 0,
    thgf: 0,
    ysv: 0,
    grossPremium: 0,
    commission: 0,
    producerCommission: 0,
    agencyCommission: 0,
  };
}

export function addPolicyToTotals(totals: Totals, policy: Policy): Totals {
  return {
    count: totals.count + 1,
    netPremium: round2(totals.netPremium + policy.netPremium),
    ghk: round2(totals.ghk + policy.ghk),
    giderVergisi: round2(totals.giderVergisi + policy.giderVergisi),
    thgf: round2(totals.thgf + policy.thgf),
    ysv: round2(totals.ysv + policy.ysv),
    grossPremium: round2(totals.grossPremium + policy.grossPremium),
    commission: round2(totals.commission + policy.commission),
    producerCommission: round2(totals.producerCommission + (policy.producerCommission ?? 0)),
    agencyCommission: round2(totals.agencyCommission + (policy.agencyCommission ?? 0)),
  };
}

export function groupBy<T extends string>(
  policies: Policy[],
  key: (policy: Policy) => T,
): Array<{ key: T; totals: Totals; policies: Policy[] }> {
  const map = new Map<T, { totals: Totals; policies: Policy[] }>();
  for (const policy of policies) {
    const k = key(policy);
    const current = map.get(k) ?? { totals: emptyTotals(), policies: [] };
    current.policies.push(policy);
    current.totals = addPolicyToTotals(current.totals, policy);
    map.set(k, current);
  }
  return [...map.entries()]
    .map(([k, v]) => ({ key: k, ...v }))
    .sort((a, b) => b.totals.grossPremium - a.totals.grossPremium);
}

export function sumPolicies(policies: Policy[]): Totals {
  return policies.reduce(addPolicyToTotals, emptyTotals());
}

export function byMonth(policies: Policy[]) {
  return groupBy(policies, (p) => monthKey(p.issueDate) || "tarihsiz");
}

export function filterPolicies(policies: Policy[], filters: Partial<ReportFilters>): Policy[] {
  return policies.filter((policy) => {
    if (filters.from && (policy.issueDate || "") < filters.from) return false;
    if (filters.to && (policy.issueDate || "") > filters.to) return false;
    if (filters.partaj && policy.partaj !== filters.partaj) return false;
    if (filters.branch && policy.branch !== filters.branch) return false;
    if (filters.producer && policy.producer !== filters.producer) return false;
    if (filters.status && filters.status !== "all" && policy.status !== filters.status) return false;
    return true;
  });
}
