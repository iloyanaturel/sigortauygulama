"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ensureSeeded, getDb } from "@/lib/store";
import { applyCommissionSplit } from "@/lib/commission";
import { mergeSettings } from "@/lib/settings";
import type { BranchItem, CatalogItem, Customer } from "@/lib/types";

type AppData = {
  ready: boolean;
  error: string | null;
  policies: ReturnType<typeof applyCommissionSplit>[];
  customers: Customer[];
  settings: ReturnType<typeof mergeSettings>;
  partajlar: CatalogItem[];
  branches: BranchItem[];
  producers: CatalogItem[];
  allPartajlar: CatalogItem[];
  allBranches: BranchItem[];
  allProducers: CatalogItem[];
};

const AppDataContext = createContext<AppData | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ensureSeeded()
      .then(() => setReady(true))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Veritabanı açılamadı");
        setReady(true);
      });
  }, []);

  const rawPolicies = useLiveQuery(() => getDb().policies.orderBy("issueDate").reverse().toArray(), []) ?? [];
  const customers = useLiveQuery(() => getDb().customers.orderBy("name").toArray(), []) ?? [];
  const partajlar = useLiveQuery(() => getDb().partajlar.toArray(), []) ?? [];
  const branches = useLiveQuery(() => getDb().branches.toArray(), []) ?? [];
  const producers = useLiveQuery(() => getDb().producers.toArray(), []) ?? [];
  const rawSettings = useLiveQuery(() => getDb().settings.get("app"), []);
  const settings = useMemo(() => mergeSettings(rawSettings), [rawSettings]);

  const policies = rawPolicies.map((policy) =>
    applyCommissionSplit(
      {
        ...policy,
        producerCommission: policy.producerCommission ?? 0,
        agencyCommission: policy.agencyCommission ?? 0,
        cancelDate: policy.cancelDate ?? "",
        cancelReason: policy.cancelReason ?? "",
        address: policy.address ?? "",
        customerId: policy.customerId,
      },
      settings,
      producers,
    ),
  );

  const value: AppData = {
    ready,
    error,
    policies,
    customers,
    settings,
    partajlar: partajlar.filter((p) => p.active).sort(sortByUsage),
    branches: branches.filter((b) => b.active).sort(sortByUsage),
    producers: producers.filter((p) => p.active).sort(sortByUsage),
    allPartajlar: partajlar,
    allBranches: branches,
    allProducers: producers,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppData {
  const ctx = useContext(AppDataContext);
  if (!ctx) {
    throw new Error("useAppData must be used within AppDataProvider");
  }
  return ctx;
}

function sortByUsage<T extends CatalogItem | BranchItem>(a: T, b: T) {
  return b.usageCount - a.usageCount || a.name.localeCompare(b.name, "tr");
}
