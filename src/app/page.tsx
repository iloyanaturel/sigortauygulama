"use client";

import Link from "next/link";
import { ImportDialog } from "@/components/import-dialog";
import { PolicyTable } from "@/components/policy-table";
import { Button } from "@/components/ui/button";
import { useAppData } from "@/hooks/use-app-data";
import { formatTRY } from "@/lib/money";
import { groupBy, sumPolicies } from "@/lib/reports";
import { monthKey, todayISO } from "@/lib/dates";

export default function DashboardPage() {
  const { ready, policies } = useAppData();
  const thisMonth = monthKey(todayISO());
  const monthPolicies = policies.filter((p) => monthKey(p.issueDate) === thisMonth && p.status === "aktif");
  const active = policies.filter((p) => p.status === "aktif");
  const cancelled = policies.filter((p) => p.status === "iptal");
  const totals = sumPolicies(monthPolicies);
  const allTotals = sumPolicies(active);
  const byPartaj = groupBy(monthPolicies, (p) => p.partaj).slice(0, 6);
  const byTali = groupBy(
    monthPolicies.filter((p) => p.producer),
    (p) => p.producer,
  );
  const recent = policies.slice(0, 8);

  if (!ready) {
    return <p className="text-muted-foreground text-sm">Yükleniyor…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">İş özeti</h1>
          <p className="text-muted-foreground text-sm">
            PDF’den poliçe yükleyin, tali raporunu ayrı alın, iptalleri ayrı şablonda tutun.
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

      {policies.length === 0 ? (
        <div className="rounded-xl border border-dashed px-6 py-16 text-center">
          <p className="text-lg font-medium">Takibe başlayın</p>
          <p className="text-muted-foreground mx-auto mt-2 max-w-lg text-sm">
            Poliçe PDF’ini yükleyin, Excel defterinizi aktarın veya ilk kaydı elle girin. Trafik, kasko,
            konut, DASK ve TSS kesintileri otomatik hesaplanır.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <ImportDialog triggerLabel="Excel’i yükle" />
            <Button asChild>
              <Link href="/policeler/yeni">PDF veya yeni poliçe</Link>
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi title="Bu ay poliçe" value={String(totals.count)} />
            <Kpi title="Bu ay net prim" value={formatTRY(totals.netPremium)} />
            <Kpi title="Bu ay brüt prim" value={formatTRY(totals.grossPremium)} />
            <Kpi title="Bu ay toplam komisyon" value={formatTRY(totals.commission)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi title="Tali komisyonu" value={formatTRY(totals.producerCommission)} subtle />
            <Kpi title="Acente komisyonu" value={formatTRY(totals.agencyCommission)} subtle />
            <Kpi title="Aktif poliçe" value={String(active.length)} subtle />
            <Kpi title="İptal poliçe" value={String(cancelled.length)} subtle />
          </div>
          <p className="text-muted-foreground text-xs">
            Tüm dönem aktif net {formatTRY(allTotals.netPremium)} · brüt {formatTRY(allTotals.grossPremium)} ·
            komisyon {formatTRY(allTotals.commission)}
          </p>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Bu ay tali toplamları">
              {byTali.length === 0 ? (
                <Empty />
              ) : (
                byTali.map((row) => (
                  <Link
                    key={row.key}
                    href="/raporlar"
                    className="flex items-center justify-between gap-3 py-2 text-sm hover:underline"
                  >
                    <span>
                      {row.key}{" "}
                      <span className="text-muted-foreground">({row.totals.count})</span>
                    </span>
                    <span className="tabular-nums">{formatTRY(row.totals.producerCommission)}</span>
                  </Link>
                ))
              )}
            </Panel>
            <Panel title="Bu ay partaj toplamları">
              {byPartaj.length === 0 ? (
                <Empty />
              ) : (
                byPartaj.map((row) => (
                  <div key={row.key} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span>
                      {row.key}{" "}
                      <span className="text-muted-foreground">({row.totals.count})</span>
                    </span>
                    <span className="tabular-nums">{formatTRY(row.totals.netPremium)}</span>
                  </div>
                ))
              )}
            </Panel>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Son poliçeler</h2>
              <Link href="/policeler" className="text-primary text-sm hover:underline">
                Tümünü gör
              </Link>
            </div>
            <PolicyTable policies={recent} />
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ title, value, subtle }: { title: string; value: string; subtle?: boolean }) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3">
      <p className="text-muted-foreground text-xs">{title}</p>
      <p className={`mt-1 font-semibold tabular-nums ${subtle ? "text-base" : "text-lg"}`}>{value}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <h2 className="mb-2 text-sm font-semibold">{title}</h2>
      <div className="divide-y">{children}</div>
    </div>
  );
}

function Empty() {
  return <p className="text-muted-foreground py-6 text-center text-sm">Bu ay henüz kayıt yok.</p>;
}
