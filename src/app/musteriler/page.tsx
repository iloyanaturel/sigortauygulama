"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAppData } from "@/hooks/use-app-data";
import { formatTRY } from "@/lib/money";

export default function CustomersPage() {
  const { policies } = useAppData();
  const customers = useMemo(() => {
    const map = new Map<
      string,
      { name: string; tc: string; phone: string; count: number; net: number; last: string }
    >();
    for (const p of policies) {
      const key = p.nationalId || p.customerName;
      const current = map.get(key) ?? {
        name: p.customerName,
        tc: p.nationalId,
        phone: p.phone,
        count: 0,
        net: 0,
        last: p.issueDate,
      };
      current.count += 1;
      current.net += p.netPremium;
      if (p.issueDate > current.last) current.last = p.issueDate;
      if (!current.phone && p.phone) current.phone = p.phone;
      map.set(key, current);
    }
    return [...map.values()].sort((a, b) => b.net - a.net);
  }, [policies]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Müşteriler</h1>
        <p className="text-muted-foreground text-sm">{customers.length} kişi / firma</p>
      </div>
      <div className="overflow-hidden rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Müşteri</th>
              <th className="px-3 py-2 font-medium">T.C.</th>
              <th className="px-3 py-2 font-medium">Telefon</th>
              <th className="px-3 py-2 font-medium text-right">Poliçe</th>
              <th className="px-3 py-2 font-medium text-right">Net prim</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={`${c.name}-${c.tc}`} className="border-t">
                <td className="px-3 py-2">
                  <Link
                    href={`/policeler?q=${encodeURIComponent(c.name)}`}
                    className="font-medium hover:underline"
                  >
                    {c.name}
                  </Link>
                </td>
                <td className="px-3 py-2 tabular-nums">{c.tc || "—"}</td>
                <td className="px-3 py-2">{c.phone || "—"}</td>
                <td className="px-3 py-2 text-right tabular-nums">{c.count}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatTRY(c.net)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
