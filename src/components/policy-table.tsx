"use client";

import { useRouter } from "next/navigation";
import { formatTRDate } from "@/lib/dates";
import { formatTRY } from "@/lib/money";
import type { Policy } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function PolicyTable({ policies }: { policies: Policy[] }) {
  const router = useRouter();

  if (policies.length === 0) {
    return (
      <p className="text-muted-foreground rounded-xl border px-4 py-10 text-center text-sm">
        Kayıt yok.
      </p>
    );
  }

  return (
    <div className="rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tarih</TableHead>
            <TableHead>Müşteri</TableHead>
            <TableHead>Partaj</TableHead>
            <TableHead>Branş</TableHead>
            <TableHead className="text-right">Net</TableHead>
            <TableHead className="text-right">Brüt</TableHead>
            <TableHead className="text-right">Komisyon</TableHead>
            <TableHead>Tali</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {policies.map((policy) => (
            <TableRow
              key={policy.id}
              className="cursor-pointer"
              onClick={() => router.push(`/policeler/${policy.id}`)}
            >
              <TableCell className="whitespace-nowrap">{formatTRDate(policy.issueDate)}</TableCell>
              <TableCell>
                <div className="font-medium">{policy.customerName}</div>
                <div className="text-muted-foreground text-xs">
                  {policy.policyNo || policy.plate || "—"}
                </div>
              </TableCell>
              <TableCell>{policy.partaj}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {policy.branch}
                  {policy.status !== "aktif" ? (
                    <Badge variant="destructive">{policy.status}</Badge>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="text-right tabular-nums">{formatTRY(policy.netPremium)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatTRY(policy.grossPremium)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatTRY(policy.commission)}</TableCell>
              <TableCell>{policy.producer || "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
