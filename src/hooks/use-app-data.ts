"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { ensureSeeded, getDb } from "@/lib/store";
import type { BranchItem, CatalogItem } from "@/lib/types";

export function useAppData() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    ensureSeeded().then(() => setReady(true));
  }, []);

  const policies =
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

  return {
    ready,
    policies,
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
