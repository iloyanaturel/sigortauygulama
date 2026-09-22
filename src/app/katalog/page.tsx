"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppData } from "@/hooks/use-app-data";
import { addCatalogRow, getDb, setCatalogActive, upsertBranch } from "@/lib/store";
import { profileForBranch } from "@/lib/catalog";
import type { CalcProfile, CatalogItem } from "@/lib/types";

const PROFILES: Array<{ value: CalcProfile; label: string }> = [
  { value: "trafik", label: "Trafik" },
  { value: "kasko", label: "Kasko" },
  { value: "konut", label: "Konut" },
  { value: "exempt", label: "Net = brüt (DASK/TSS)" },
];

export default function CatalogPage() {
  const { partajlar, producers, branches, allPartajlar, allProducers, allBranches } = useAppData();
  const [tab, setTab] = useState<"partaj" | "tali" | "brans">("partaj");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Katalog"
        description="Sigorta şirketi / partaj, tali ve branş ekleyin. Pasif olanlar form listelerinde görünmez."
      />
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["partaj", `Sigorta şirketi / partaj (${partajlar.length})`],
            ["tali", `Tali / kişiler (${producers.length})`],
            ["brans", `Branş (${branches.length})`],
          ] as const
        ).map(([key, label]) => (
          <Button key={key} size="sm" variant={tab === key ? "default" : "outline"} onClick={() => setTab(key)}>
            {label}
          </Button>
        ))}
      </div>
      {tab === "partaj" ? <PartajList rows={allPartajlar} /> : null}
      {tab === "tali" ? <ProducerList rows={allProducers} /> : null}
      {tab === "brans" ? <BranchList rows={allBranches} /> : null}
    </div>
  );
}

function PartajList({ rows }: { rows: CatalogItem[] }) {
  const [name, setName] = useState("");
  async function add() {
    if (!name.trim()) return;
    await addCatalogRow("partajlar", name);
    setName("");
    toast.success("Sigorta şirketi / partaj eklendi.");
  }
  return (
    <section className="space-y-4 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap gap-2">
        <Input className="h-9 max-w-xs" placeholder="QUICK, SOMPO, AXA-OVİ…" value={name} onChange={(e) => setName(e.target.value)} />
        <Button onClick={() => void add()}>Ekle</Button>
      </div>
      <CatalogTable
        rows={rows}
        onToggle={(row) => void setCatalogActive("partajlar", row.id, !row.active)}
      />
    </section>
  );
}

function ProducerList({ rows }: { rows: CatalogItem[] }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState<CatalogItem["role"]>("tali");
  const [share, setShare] = useState("50");
  async function add() {
    if (!name.trim()) return;
    const taliShareRate = role === "tali" ? Number(share.replace(",", ".")) / 100 : 0;
    await addCatalogRow("producers", name, { role, taliShareRate: Number.isFinite(taliShareRate) ? taliShareRate : 0.5 });
    setName("");
    toast.success("Kişi eklendi.");
  }
  async function patch(row: CatalogItem, partial: Partial<CatalogItem>) {
    await getDb().producers.update(row.id, partial);
  }
  return (
    <section className="space-y-4 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-end gap-2">
        <Input className="h-9 max-w-xs" placeholder="Tali veya kişi adı" value={name} onChange={(e) => setName(e.target.value)} />
        <select className="h-9 rounded-md border bg-background px-2 text-sm" value={role} onChange={(e) => setRole(e.target.value as CatalogItem["role"])}>
          <option value="tali">Tali</option>
          <option value="agency">Acente</option>
          <option value="other">Diğer</option>
        </select>
        {role === "tali" ? (
          <span className="flex items-center gap-1 text-sm">
            <Input className="h-9 w-16" value={share} onChange={(e) => setShare(e.target.value)} />
            <span className="text-muted-foreground">% hakediş</span>
          </span>
        ) : null}
        <Button onClick={() => void add()}>Ekle</Button>
      </div>
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Ad</th>
              <th className="px-3 py-2 font-medium">Tür</th>
              <th className="px-3 py-2 font-medium">Hakediş %</th>
              <th className="px-3 py-2 font-medium">Durum</th>
            </tr>
          </thead>
          <tbody>
            {rows
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name, "tr"))
              .map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-3 py-2 font-medium">{row.name}</td>
                  <td className="px-3 py-2">
                    <select
                      className="h-8 rounded-md border bg-background px-2"
                      value={row.role ?? "other"}
                      onChange={(e) => void patch(row, { role: e.target.value as CatalogItem["role"] })}
                    >
                      <option value="tali">Tali</option>
                      <option value="agency">Acente</option>
                      <option value="other">Diğer</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      className="h-8 w-16"
                      disabled={row.role !== "tali"}
                      value={String(Math.round((row.taliShareRate ?? 0.5) * 100))}
                      onChange={(e) => {
                        const n = Number(e.target.value.replace(",", ".")) / 100;
                        if (!Number.isFinite(n)) return;
                        void patch(row, { taliShareRate: Math.min(1, Math.max(0, n)) });
                      }}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Button size="sm" variant="outline" onClick={() => void setCatalogActive("producers", row.id, !row.active)}>
                      {row.active ? "Pasifleştir" : "Aktif et"}
                    </Button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function BranchList({ rows }: { rows: ReturnType<typeof useAppData>["allBranches"] }) {
  const [name, setName] = useState("");
  const [profile, setProfile] = useState<CalcProfile>("kasko");
  const [rate, setRate] = useState("10");
  async function add() {
    if (!name.trim()) return;
    await upsertBranch(name.trim(), profile, Number(rate.replace(",", ".")) / 100 || 0.1);
    setName("");
    toast.success("Branş eklendi.");
  }
  async function patchRate(id: string, value: string) {
    const n = Number(value.replace(",", ".")) / 100;
    if (!Number.isFinite(n)) return;
    await getDb().branches.update(id, { defaultCommissionRate: Math.min(1, Math.max(0, n)) });
  }
  return (
    <section className="space-y-4 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap gap-2">
        <Input className="h-9 max-w-xs" placeholder="Branş adı" value={name} onChange={(e) => setName(e.target.value)} />
        <select className="h-9 rounded-md border bg-background px-2 text-sm" value={profile} onChange={(e) => setProfile(e.target.value as CalcProfile)}>
          {PROFILES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <Input className="h-9 w-16" value={rate} onChange={(e) => setRate(e.target.value)} />
        <Button onClick={() => void add()}>Ekle</Button>
      </div>
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Branş</th>
              <th className="px-3 py-2 font-medium">Hesap</th>
              <th className="px-3 py-2 font-medium">Komisyon %</th>
              <th className="px-3 py-2 font-medium">Durum</th>
            </tr>
          </thead>
          <tbody>
            {rows
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name, "tr"))
              .map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-3 py-2 font-medium">{row.name}</td>
                  <td className="px-3 py-2">{row.profile}</td>
                  <td className="px-3 py-2">
                    <Input
                      className="h-8 w-16"
                      defaultValue={String(Math.round(row.defaultCommissionRate * 1000) / 10)}
                      onBlur={(e) => void patchRate(row.id, e.target.value)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Button size="sm" variant="outline" onClick={() => void setCatalogActive("branches", row.id, !row.active)}>
                      {row.active ? "Pasifleştir" : "Aktif et"}
                    </Button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <p className="text-muted-foreground text-xs">
        Yeni branşın hesap tipi boşsa otomatik seçilir: {profileForBranch("Trafik")}.
      </p>
    </section>
  );
}

function CatalogTable({ rows, onToggle }: { rows: CatalogItem[]; onToggle: (row: CatalogItem) => void }) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left">
          <tr>
            <th className="px-3 py-2 font-medium">Ad</th>
            <th className="px-3 py-2 font-medium">Kullanım</th>
            <th className="px-3 py-2 font-medium">Durum</th>
          </tr>
        </thead>
        <tbody>
          {rows
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name, "tr"))
            .map((row) => (
              <tr key={row.id} className="border-t">
                <td className="px-3 py-2 font-medium">{row.name}</td>
                <td className="px-3 py-2 tabular-nums">{row.usageCount}</td>
                <td className="px-3 py-2">
                  <Button size="sm" variant="outline" onClick={() => onToggle(row)}>
                    {row.active ? "Pasifleştir" : "Aktif et"}
                  </Button>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
