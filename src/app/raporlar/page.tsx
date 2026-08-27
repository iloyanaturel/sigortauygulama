"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAppData } from "@/hooks/use-app-data";
import { policiesToWorkbook } from "@/lib/excel";
import { formatTRY } from "@/lib/money";
import { byMonth, groupBy, sumPolicies, type Totals } from "@/lib/reports";

export default function ReportsPage() {
  const { policies } = useAppData();
  const [tab, setTab] = useState<"partaj" | "brans" | "tali" | "ay">("partaj");
  const active = policies.filter((p) => p.status !== "iptal");
  const grand = sumPolicies(active);

  const rows = useMemo(() => {
    if (tab === "partaj") return groupBy(active, (p) => p.partaj || "—");
    if (tab === "brans") return groupBy(active, (p) => p.branch || "—");
    if (tab === "tali") return groupBy(active, (p) => p.producer || "—");
    return byMonth(active).sort((a, b) => b.key.localeCompare(a.key));
  }, [active, tab]);

  function exportExcel() {
    const buf = policiesToWorkbook(policies);
    const blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sigorta-takipleri.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Raporlar</h1>
          <p className="text-muted-foreground text-sm">
            Partaj, branş ve tali bazında net, vergi, fon ve brüt toplamları.
          </p>
        </div>
        <Button variant="outline" onClick={exportExcel}>
          Excel dışa aktar
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["partaj", "Partaj"],
            ["brans", "Branş"],
            ["tali", "Tali"],
            ["ay", "Ay"],
          ] as const
        ).map(([key, label]) => (
          <Button key={key} variant={tab === key ? "default" : "outline"} onClick={() => setTab(key)}>
            {label}
          </Button>
        ))}
      </div>
      <TotalsBar totals={grand} label="Genel toplam" />
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Kırılım</th>
              <th className="px-3 py-2 text-right font-medium">Adet</th>
              <th className="px-3 py-2 text-right font-medium">Net prim</th>
              <th className="px-3 py-2 text-right font-medium">G.H.K.</th>
              <th className="px-3 py-2 text-right font-medium">Gider vergisi</th>
              <th className="px-3 py-2 text-right font-medium">T.H.G. fonu</th>
              <th className="px-3 py-2 text-right font-medium">Y.S.V.</th>
              <th className="px-3 py-2 text-right font-medium">Brüt prim</th>
              <th className="px-3 py-2 text-right font-medium">Komisyon</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-t">
                <td className="px-3 py-2 font-medium">{row.key}</td>
                <td className="px-3 py-2 text-right tabular-nums">{row.totals.count}</td>
                <Num v={row.totals.netPremium} />
                <Num v={row.totals.ghk} />
                <Num v={row.totals.giderVergisi} />
                <Num v={row.totals.thgf} />
                <Num v={row.totals.ysv} />
                <Num v={row.totals.grossPremium} />
                <Num v={row.totals.commission} />
              </tr>
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
    <div className="grid gap-2 rounded-xl border bg-card p-3 sm:grid-cols-4">
      <Stat k={label} v={`${totals.count} poliçe`} />
      <Stat k="Toplam net" v={formatTRY(totals.netPremium)} />
      <Stat k="Toplam brüt" v={formatTRY(totals.grossPremium)} />
      <Stat k="Toplam komisyon" v={formatTRY(totals.commission)} />
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
