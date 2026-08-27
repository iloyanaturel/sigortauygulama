"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { ensureSeeded, getDb } from "@/lib/store";
import { applyCommissionSplit } from "@/lib/commission";
import { mergeSettings } from "@/lib/settings";
import type { BranchItem, CatalogItem } from "@/lib/types";

export function useAppData() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    ensureSeeded().then(() => setReady(true));
  }, []);

  const rawPolicies =
    useLiveQuery(
      () => (ready ? getDb().policies.orderBy("issueDate").reverse().toArray() : []),
      [ready],
    ) ?? [];
  const partajlar =
    useLiveQuery(() => (ready ? getDb().partajlar.toArray() : []), [ready]) ?? [];
  const branches =
    useLiveQuery(() => (ready ? getDb().branches.toArray() : []), [ready]) ?? [];
  const producers =
    useLiveQuery(() => (ready ? getDb().producers.toArray() : []), [ready]) ?? [];
  const rawSettings = useLiveQuery(() => (ready ? getDb().settings.get("app") : undefined), [ready]);
  const settings = mergeSettings(rawSettings);
  const policies = rawPolicies.map((policy) =>
    policy.producerCommission == null || policy.agencyCommission == null
      ? applyCommissionSplit(
          {
            ...policy,
            producerCommission: policy.producerCommission ?? 0,
            agencyCommission: policy.agencyCommission ?? 0,
            cancelDate: policy.cancelDate ?? "",
            cancelReason: policy.cancelReason ?? "",
          },
          settings,
        )
      : {
          ...policy,
          cancelDate: policy.cancelDate ?? "",
          cancelReason: policy.cancelReason ?? "",
        },
  );

  return {
    ready,
    policies,
    settings,
    partajlar: partajlar.filter((p) => p.active).sort(sortByUsage),
    branches: branches.filter((b) => b.active).sort(sortByUsage),
    producers: producers.filter((p) => p.active).sort(sortByUsage),
    allPartajlar: partajlar,
    allBranches: branches,
    allProducers: producers,
  };
}

function sortByUsage<T extends CatalogItem | BranchItem>(a: T, b: T) {
  return b.usageCount - a.usageCount || a.name.localeCompare(b.name, "tr");
}
