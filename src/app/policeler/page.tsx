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
import { sumPolicies } from "@/lib/reports";

export default function PoliciesPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground text-sm">Yükleniyor…</p>}>
      <PoliciesPageInner />
    </Suspense>
  );
}

function PoliciesPageInner() {
  const { policies, partajlar, branches } = useAppData();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [partaj, setPartaj] = useState("");
  const [branch, setBranch] = useState("");
  const [status, setStatus] = useState("Aktif");

  const filtered = useMemo(() => {
    const query = foldTurkish(q);
    return policies.filter((p) => {
      if (partaj && p.partaj !== partaj) return false;
      if (branch && p.branch !== branch) return false;
      if (status === "Aktif" && p.status !== "aktif") return false;
      if (status === "İptal" && p.status !== "iptal") return false;
      if (!query) return true;
      const blob = foldTurkish(
        `${p.customerName} ${p.policyNo} ${p.plate} ${p.nationalId} ${p.producer} ${p.partaj} ${p.branch}`,
      );
      return blob.includes(query);
    });
  }, [policies, q, partaj, branch, status]);

  const totals = sumPolicies(filtered);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Poliçeler</h1>
          <p className="text-muted-foreground text-sm">
            {filtered.length} kayıt · net {formatTRY(totals.netPremium)} · brüt {formatTRY(totals.grossPremium)}
          </p>
        </div>
        <div className="flex gap-2">
          <ImportDialog />
          <Button asChild>
            <Link href="/policeler/yeni">Yeni poliçe</Link>
          </Button>
        </div>
      </div>
      <div className="grid gap-2 md:grid-cols-4">
        <Input
          className="h-9"
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
          value={status}
          onChange={setStatus}
          allowCreate={false}
          placeholder="Durum"
          options={[
            { value: "hepsi", label: "Tümü" },
            { value: "aktif", label: "Aktif" },
            { value: "iptal", label: "İptal" },
          ]}
        />
      </div>
      <PolicyTable policies={filtered} />
    </div>
  );
}
