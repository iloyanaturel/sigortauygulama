import type { Policy } from "@/lib/types";
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
