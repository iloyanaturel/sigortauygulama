"use client";

import Link from "next/link";
import { useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ImportDialog } from "@/components/import-dialog";
import { PolicyTable } from "@/components/policy-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/searchable-select";
import { useAppData } from "@/hooks/use-app-data";
import { foldTurkish } from "@/lib/text";
import { formatTRY } from "@/lib/money";
import { filterPolicies, sumPolicies } from "@/lib/reports";
import { isTaliProducer } from "@/lib/commission";

export default function PoliciesPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground text-sm">Yükleniyor…</p>}>
      <PoliciesPageInner />
    </Suspense>
  );
}

function PoliciesPageInner() {
  const { policies, partajlar, branches, producers, settings } = useAppData();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [partaj, setPartaj] = useState("");
  const [branch, setBranch] = useState("");
  const [producer, setProducer] = useState("");
  const initialStatus =
    searchParams.get("durum") === "iptal" ? "iptal" : searchParams.get("durum") === "hepsi" ? "all" : "aktif";
  const [status, setStatus] = useState<"all" | "aktif" | "iptal" | "zeyl">(initialStatus);

  const filtered = useMemo(() => {
    const query = foldTurkish(q);
    return filterPolicies(policies, { partaj, branch, producer, status }).filter((p) => {
      if (!query) return true;
      const blob = foldTurkish(
        `${p.customerName} ${p.policyNo} ${p.plate} ${p.nationalId} ${p.producer} ${p.partaj} ${p.branch}`,
      );
      return blob.includes(query);
    });
  }, [policies, q, partaj, branch, producer, status]);

  const totals = sumPolicies(filtered);
  const taliOptions = producers.filter((p) => isTaliProducer(p.name, settings));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Poliçeler</h1>
          <p className="text-muted-foreground text-sm">
            {filtered.length} kayıt · net {formatTRY(totals.netPremium)} · brüt {formatTRY(totals.grossPremium)} ·
            komisyon {formatTRY(totals.commission)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ImportDialog />
          <Button variant="outline" asChild>
            <Link href="/policeler/iptal">İptal poliçesi</Link>
          </Button>
          <Button asChild>
            <Link href="/policeler/yeni">Yeni poliçe</Link>
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["aktif", "Aktif"],
            ["iptal", "İptal"],
            ["all", "Tümü"],
          ] as const
        ).map(([key, label]) => (
          <Button key={key} size="sm" variant={status === key ? "default" : "outline"} onClick={() => setStatus(key)}>
            {label}
          </Button>
        ))}
      </div>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
        <Input
          className="h-9 xl:col-span-2"
          placeholder="Müşteri, plaka, poliçe no, T.C."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <SearchableSelect
          value={partaj}
          onChange={setPartaj}
          allowCreate={false}
          placeholder="Tüm partajlar"
          options={partajlar.map((p) => ({ value: p.id, label: p.name }))}
        />
        <SearchableSelect
          value={branch}
          onChange={setBranch}
          allowCreate={false}
          placeholder="Tüm branşlar"
          options={branches.map((b) => ({ value: b.id, label: b.name }))}
        />
        <SearchableSelect
          value={producer}
          onChange={setProducer}
          allowCreate={false}
          placeholder="Tüm taliler"
          options={(taliOptions.length ? taliOptions : producers).map((p) => ({ value: p.id, label: p.name }))}
        />
      </div>
      <PolicyTable policies={filtered} />
    </div>
  );
}
