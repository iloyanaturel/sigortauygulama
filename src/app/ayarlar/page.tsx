"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ImportDialog } from "@/components/import-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppData } from "@/hooks/use-app-data";
import { policiesToWorkbook } from "@/lib/excel";
import { getDb } from "@/lib/store";
import { RATES } from "@/lib/premiums";
import { formatPercent } from "@/lib/money";

export default function SettingsPage() {
  const { policies, partajlar, branches, producers } = useAppData();
  const [confirmText, setConfirmText] = useState("");

  function download() {
    const buf = policiesToWorkbook(policies);
    const blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sigorta-yedek.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function wipe() {
    if (confirmText !== "SİL") {
      toast.error("Onay için SİL yazın.");
      return;
    }
    await getDb().policies.clear();
    toast.success("Tüm poliçeler silindi. Partaj ve branş listesi duruyor.");
    setConfirmText("");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Ayarlar</h1>
        <p className="text-muted-foreground text-sm">
          Veriler bu tarayıcıda saklanır. Excel yedeği alın; Vercel’e deploy sonrası aynı dosyayı tekrar yükleyebilirsiniz.
        </p>
      </div>

      <section className="space-y-3 rounded-xl border bg-card p-4">
        <h2 className="text-sm font-semibold">Kesinti oranları</h2>
        <ul className="text-muted-foreground space-y-1 text-sm">
          <li>Gider vergisi (BSMV): {formatPercent(RATES.giderVergisi)} — kasko, trafik, konut, İMM</li>
          <li>G.H.K. payı: {formatPercent(RATES.ghk)} — zorunlu trafik (ZMSS neti)</li>
          <li>T.H.G. fonu: {formatPercent(RATES.thgf)} — zorunlu trafik (ZMSS neti)</li>
          <li>Y.S.V.: {formatPercent(RATES.ysv)} — konut yangın primi</li>
          <li>DASK, TSS, seyahat sağlık: net = brüt</li>
        </ul>
      </section>

      <section className="space-y-3 rounded-xl border bg-card p-4">
        <h2 className="text-sm font-semibold">Katalog</h2>
        <p className="text-sm">
          {partajlar.length} partaj · {branches.length} branş · {producers.length} tali · {policies.length} poliçe
        </p>
        <div className="flex flex-wrap gap-2">
          {partajlar.map((p) => (
            <span key={p.id} className="rounded-full border px-2 py-1 text-xs">
              {p.name}
            </span>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-xl border bg-card p-4">
        <h2 className="text-sm font-semibold">Yedekleme</h2>
        <div className="flex flex-wrap gap-2">
          <ImportDialog triggerLabel="Excel içe aktar" />
          <Button variant="outline" onClick={download}>
            Excel yedek al
          </Button>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-destructive/30 bg-card p-4">
        <h2 className="text-sm font-semibold">Tehlikeli alan</h2>
        <p className="text-muted-foreground text-sm">Tüm poliçeleri silmek için aşağıya SİL yazın.</p>
        <div className="flex gap-2">
          <Input
            className="h-9 max-w-40"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="SİL"
          />
          <Button variant="destructive" onClick={wipe}>
            Poliçeleri sil
          </Button>
        </div>
      </section>
    </div>
  );
}
