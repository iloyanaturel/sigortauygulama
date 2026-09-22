"use client";

import { PolicyTable } from "@/components/policy-table";
import { useAppData } from "@/hooks/use-app-data";
import { daysUntil } from "@/lib/dates";

export default function RenewalsPage() {
  const { policies } = useAppData();
  const upcoming = policies
    .filter((p) => p.status === "aktif")
    .map((p) => ({ policy: p, days: daysUntil(p.endDate) ?? 9999 }))
    .filter((x) => x.days <= 60)
    .sort((a, b) => a.days - b.days);

  const overdue = upcoming.filter((x) => x.days < 0);
  const soon = upcoming.filter((x) => x.days >= 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Yenilemeler</h1>
        <p className="text-muted-foreground text-sm">
          Vadesi 60 gün içinde dolacak veya geçmiş poliçeler.
        </p>
      </div>
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Vadesi geçmiş ({overdue.length})</h2>
        <PolicyTable policies={overdue.map((x) => x.policy)} />
      </section>
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Önümüzdeki 60 gün ({soon.length})</h2>
        <PolicyTable policies={soon.map((x) => x.policy)} />
      </section>
    </div>
  );
}
