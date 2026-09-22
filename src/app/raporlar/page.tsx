"use client";

import { Fragment, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/searchable-select";
import { PolicyTable } from "@/components/policy-table";
import { useAppData } from "@/hooks/use-app-data";
import { policiesToWorkbook } from "@/lib/excel";
import { formatTRY } from "@/lib/money";
import { isTaliProducer } from "@/lib/commission";
import {
  byMonth,
  EMPTY_FILTERS,
  filterPolicies,
  groupBy,
  sumPolicies,
  type Totals,
} from "@/lib/reports";
import type { ReportFilters } from "@/lib/types";

export default function ReportsPage() {
  const { policies, partajlar, branches, producers, settings } = useAppData();
  const [tab, setTab] = useState<"partaj" | "brans" | "tali" | "ay">("tali");
  const [filters, setFilters] = useState<ReportFilters>(EMPTY_FILTERS);
  const [openKey, setOpenKey] = useState<string | null>(null);

  const filtered = useMemo(() => filterPolicies(policies, filters), [policies, filters]);
  const grand = sumPolicies(filtered);
  const taliNames = producers.filter((p) => isTaliProducer(p.name, settings, producers)).map((p) => p.name);

  const rows = useMemo(() => {
    if (tab === "partaj") return groupBy(filtered, (p) => p.partaj || "—");
    if (tab === "brans") return groupBy(filtered, (p) => p.branch || "—");
    if (tab === "tali") {
      const grouped = groupBy(filtered, (p) => p.producer || "Acente / tali yok");
      if (filters.producer) return grouped;
      return grouped;
    }
    return byMonth(filtered).sort((a, b) => b.key.localeCompare(a.key));
  }, [filtered, tab, filters.producer]);

  function patch(partial: Partial<ReportFilters>) {
    setFilters((prev) => ({ ...prev, ...partial }));
    setOpenKey(null);
  }

  function exportExcel() {
    const buf = policiesToWorkbook(filtered);
    const blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filters.producer
      ? `rapor-${filters.producer}.xlsx`
      : "sigorta-rapor.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Raporlar</h1>
          <p className="text-muted-foreground text-sm">
            Tali, partaj, branş ve tarihi birbirinden bağımsız süzün. Tamer Dinç veya Şenel Yıldırım’ı
            seçerek yalnızca o talinin raporunu alın.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setFilters(EMPTY_FILTERS)}>
            Filtreleri temizle
          </Button>
          <Button variant="outline" onClick={exportExcel}>
            Filtrelenmiş Excel
          </Button>
        </div>
      </div>

      <div className="grid gap-2 rounded-xl border bg-card p-3 md:grid-cols-2 xl:grid-cols-6">
        <label className="text-xs">
          <span className="text-muted-foreground mb-1 block">Başlangıç</span>
          <Input
            type="date"
            className="h-9"
            value={filters.from}
            onChange={(e) => patch({ from: e.target.value })}
          />
        </label>
        <label className="text-xs">
          <span className="text-muted-foreground mb-1 block">Bitiş</span>
          <Input
            type="date"
            className="h-9"
            value={filters.to}
            onChange={(e) => patch({ to: e.target.value })}
          />
        </label>
        <label className="text-xs">
          <span className="text-muted-foreground mb-1 block">Partaj</span>
          <SearchableSelect
            value={filters.partaj}
            onChange={(partaj) => patch({ partaj })}
            allowCreate={false}
            placeholder="Tümü"
            options={partajlar.map((p) => ({ value: p.id, label: p.name }))}
          />
        </label>
        <label className="text-xs">
          <span className="text-muted-foreground mb-1 block">Branş</span>
          <SearchableSelect
            value={filters.branch}
            onChange={(branch) => patch({ branch })}
            allowCreate={false}
            placeholder="Tümü"
            options={branches.map((b) => ({ value: b.id, label: b.name }))}
          />
        </label>
        <label className="text-xs">
          <span className="text-muted-foreground mb-1 block">Tali</span>
          <SearchableSelect
            value={filters.producer}
            onChange={(producer) => patch({ producer })}
            allowCreate={false}
            placeholder="Tüm taliler"
            options={(taliNames.length ? taliNames : producers.map((p) => p.name)).map((name) => ({
              value: name,
              label: name,
            }))}
          />
        </label>
        <label className="text-xs">
          <span className="text-muted-foreground mb-1 block">Durum</span>
          <SearchableSelect
            value={
              filters.status === "aktif"
                ? "Aktif"
                : filters.status === "iptal"
                  ? "İptal"
                  : filters.status === "zeyl"
                    ? "Zeyl"
                    : "Tümü"
            }
            onChange={(label) =>
              patch({
                status:
                  label === "İptal"
                    ? "iptal"
                    : label === "Zeyl"
                      ? "zeyl"
                      : label === "Aktif"
                        ? "aktif"
                        : "all",
              })
            }
            allowCreate={false}
            placeholder="Durum"
            options={[
              { value: "aktif", label: "Aktif" },
              { value: "iptal", label: "İptal" },
              { value: "all", label: "Tümü" },
            ]}
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["tali", "Tali"],
            ["partaj", "Partaj"],
            ["brans", "Branş"],
            ["ay", "Ay"],
          ] as const
        ).map(([key, label]) => (
          <Button key={key} variant={tab === key ? "default" : "outline"} onClick={() => setTab(key)}>
            {label}
          </Button>
        ))}
      </div>

      <TotalsBar totals={grand} label="Filtrelenmiş toplam" />

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Kırılım</th>
              <th className="px-3 py-2 text-right font-medium">Adet</th>
              <th className="px-3 py-2 text-right font-medium">Net prim</th>
              <th className="px-3 py-2 text-right font-medium">Brüt prim</th>
              <th className="px-3 py-2 text-right font-medium">Toplam komisyon</th>
              <th className="px-3 py-2 text-right font-medium">Tali komisyonu</th>
              <th className="px-3 py-2 text-right font-medium">Acente komisyonu</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <Fragment key={row.key}>
                <tr
                  className="cursor-pointer border-t hover:bg-muted/30"
                  onClick={() => setOpenKey((current) => (current === row.key ? null : row.key))}
                >
                  <td className="px-3 py-2 font-medium">{row.key}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{row.totals.count}</td>
                  <Num v={row.totals.netPremium} />
                  <Num v={row.totals.grossPremium} />
                  <Num v={row.totals.commission} />
                  <Num v={row.totals.producerCommission} />
                  <Num v={row.totals.agencyCommission} />
                </tr>
                {openKey === row.key ? (
                  <tr className="border-t bg-muted/20">
                    <td colSpan={7} className="p-3">
                      <PolicyTable policies={row.policies} />
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Num({ v }: { v: number }) {
  return <td className="px-3 py-2 text-right tabular-nums">{formatTRY(v)}</td>;
}

function TotalsBar({ totals, label }: { totals: Totals; label: string }) {
  return (
    <div className="grid gap-2 rounded-xl border bg-card p-3 sm:grid-cols-2 lg:grid-cols-5">
      <Stat k={label} v={`${totals.count} poliçe`} />
      <Stat k="Toplam net" v={formatTRY(totals.netPremium)} />
      <Stat k="Toplam brüt" v={formatTRY(totals.grossPremium)} />
      <Stat k="Tali komisyonu" v={formatTRY(totals.producerCommission)} />
      <Stat k="Acente komisyonu" v={formatTRY(totals.agencyCommission)} />
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{k}</p>
      <p className="font-medium tabular-nums">{v}</p>
    </div>
  );
}
