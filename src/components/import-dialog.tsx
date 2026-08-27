"use client";

import { useState } from "react";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { parseWorkbook } from "@/lib/excel";
import { getDb, upsertBranch, upsertCatalogName } from "@/lib/store";
import { defaultCommissionForBranch, profileForBranch } from "@/lib/catalog";
import { formatTRY } from "@/lib/money";

export function ImportDialog({ triggerLabel = "Excel içe aktar" }: { triggerLabel?: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setSummary(null);
    try {
      const buf = await file.arrayBuffer();
      const parsed = parseWorkbook(buf);
      if (parsed.policies.length === 0) {
        toast.error("Aktarılacak poliçe bulunamadı.");
        return;
      }
      const db = getDb();
      const existing = await db.policies.toArray();
      const keys = new Set(
        existing.map((p) => `${p.policyNo}|${p.partaj}|${p.netPremium}`),
      );
      let imported = 0;
      let dupes = 0;
      for (const row of parsed.policies) {
        const key = `${row.policy.policyNo}|${row.policy.partaj}|${row.policy.netPremium}`;
        if (row.policy.policyNo && keys.has(key)) {
          dupes += 1;
          continue;
        }
        await db.policies.put(row.policy);
        await upsertCatalogName("partajlar", row.policy.partaj);
        await upsertCatalogName("producers", row.policy.producer);
        await upsertBranch(
          row.policy.branch,
          profileForBranch(row.policy.branch),
          defaultCommissionForBranch(row.policy.branch),
        );
        keys.add(key);
        imported += 1;
      }
      const net = parsed.policies.reduce((s, r) => s + r.policy.netPremium, 0);
      setSummary(
        `${imported} poliçe aktarıldı${dupes ? `, ${dupes} mükerrer atlandı` : ""}${parsed.skipped ? `, ${parsed.skipped} satır yok sayıldı` : ""}. Toplam net: ${formatTRY(net)}.`,
      );
      toast.success("Excel aktarımı tamamlandı.");
    } catch (error) {
      console.error(error);
      toast.error("Dosya okunamadı. xlsx formatını kullanın.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants({ variant: "outline" })}>
        {triggerLabel}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Kesilen poliçeler Excel’i</DialogTitle>
          <DialogDescription>
            Mevcut aylık takip dosyanızı yükleyin. Partaj, branş, net/brüt prim ve tali bilgiler
            otomatik ayrıştırılır; vergi ve fonlar branşa göre hesaplanır.
          </DialogDescription>
        </DialogHeader>
        <input
          type="file"
          accept=".xlsx,.xls"
          disabled={busy}
          className="text-sm"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        {summary ? <p className="text-sm">{summary}</p> : null}
      </DialogContent>
    </Dialog>
  );
}
