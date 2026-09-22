"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppData } from "@/hooks/use-app-data";
import { foldTurkish } from "@/lib/text";
import { formatTRY } from "@/lib/money";

export default function CustomersPage() {
  const { customers, policies } = useAppData();
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    const query = foldTurkish(q);
    return customers
      .map((customer) => {
        const related = policies.filter(
          (policy) =>
            policy.customerId === customer.id ||
            (customer.nationalId && policy.nationalId === customer.nationalId) ||
            foldTurkish(policy.customerName) === foldTurkish(customer.name),
        );
        return {
          ...customer,
          count: related.length,
          net: related.reduce((sum, policy) => sum + (policy.netPremium || 0), 0),
        };
      })
      .filter((row) => {
        if (!query) return true;
        return foldTurkish(`${row.name} ${row.nationalId} ${row.phone} ${row.plates.join(" ")}`).includes(query);
      })
      .sort((a, b) => a.name.localeCompare(b.name, "tr"));
  }, [customers, policies, q]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Müşteriler"
        description="Ruhsattan veya elle müşteri kartı açın. Poliçe kaydedilince aynı kişi otomatik eşleşir."
        actions={
          <Button asChild>
            <Link href="/musteriler/yeni">Yeni müşteri</Link>
          </Button>
        }
      />
      <Input className="h-9 max-w-sm" placeholder="Ad, T.C., plaka ara" value={q} onChange={(e) => setQ(e.target.value)} />
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed px-6 py-12 text-center">
          <p className="font-medium">Henüz müşteri kartı yok</p>
          <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm">
            Ruhsat fotoğrafı yükleyerek kayıt açın veya poliçe kestiğinizde müşteri otomatik oluşur.
          </p>
          <Button className="mt-4" asChild>
            <Link href="/musteriler/yeni">Ruhsattan müşteri aç</Link>
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Müşteri</th>
                <th className="px-3 py-2 font-medium">T.C.</th>
                <th className="px-3 py-2 font-medium">Telefon</th>
                <th className="px-3 py-2 font-medium">Plaka</th>
                <th className="px-3 py-2 font-medium text-right">Poliçe</th>
                <th className="px-3 py-2 font-medium text-right">Net prim</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-3 py-2">
                    <Link href={`/musteriler/${row.id}`} className="font-medium hover:underline">
                      {row.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 tabular-nums">{row.nationalId || "—"}</td>
                  <td className="px-3 py-2">{row.phone || "—"}</td>
                  <td className="px-3 py-2">{row.plates.slice(0, 2).join(", ") || "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{row.count}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatTRY(row.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
