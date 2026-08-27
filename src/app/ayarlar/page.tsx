"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ImportDialog } from "@/components/import-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppData } from "@/hooks/use-app-data";
import { emptyPolicyTemplate, policiesToWorkbook } from "@/lib/excel";
import { getDb, saveSettings } from "@/lib/store";
import { RATES } from "@/lib/premiums";
import { formatPercent } from "@/lib/money";
import { isTaliProducer } from "@/lib/commission";
import { foldTurkish } from "@/lib/text";

function downloadBuffer(buf: ArrayBuffer, name: string) {
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SettingsPage() {
  const { policies, partajlar, branches, producers, settings } = useAppData();
  const [confirmText, setConfirmText] = useState("");
  const [agencyName, setAgencyName] = useState(settings.agencyName);
  const [taliShare, setTaliShare] = useState(String(Math.round(settings.taliShareRate * 100)));
  const [rates, setRates] = useState<Record<string, string>>({});
  const [taliChecked, setTaliChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setAgencyName(settings.agencyName);
    setTaliShare(String(Math.round(settings.taliShareRate * 100)));
    setRates(
      Object.fromEntries(branches.map((b) => [b.id, String(Math.round(b.defaultCommissionRate * 1000) / 10)])),
    );
    setTaliChecked(
      Object.fromEntries(producers.map((p) => [p.id, isTaliProducer(p.name, settings)])),
    );
  }, [settings, branches, producers]);

  async function save() {
    const share = Number(taliShare.replace(",", ".")) / 100;
    if (!Number.isFinite(share) || share < 0 || share > 1) {
      toast.error("Tali payı 0–100 arasında olmalı.");
      return;
    }
    const db = getDb();
    for (const branch of branches) {
      const raw = Number((rates[branch.id] ?? "").replace(",", "."));
      if (!Number.isFinite(raw) || raw < 0 || raw > 100) continue;
      await db.branches.update(branch.id, { defaultCommissionRate: raw / 100 });
    }
    const taliProducerNames = producers.filter((p) => taliChecked[p.id]).map((p) => p.name);
    await saveSettings({
      agencyName: agencyName.trim() || "Bolaman Sigorta",
      taliShareRate: share,
      taliProducerNames,
    });
    toast.success("Ayarlar kaydedildi.");
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
          Komisyon oranlarını ve tali payını buradan değiştirin. Veriler bu tarayıcıda saklanır.
        </p>
      </div>

      <section className="space-y-3 rounded-xl border bg-card p-4">
        <h2 className="text-sm font-semibold">Acente</h2>
        <Input className="h-9 max-w-sm" value={agencyName} onChange={(e) => setAgencyName(e.target.value)} />
      </section>

      <section className="space-y-3 rounded-xl border bg-card p-4">
        <div>
          <h2 className="text-sm font-semibold">Komisyon oranları (net prim üzerinden)</h2>
          <p className="text-muted-foreground text-xs">
            Varsayılan: trafik %10, kasko %15, konut %20, TSS %20, DASK %10, seyahat %10.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {branches
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name, "tr"))
            .map((branch) => (
              <label key={branch.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm">
                <span>{branch.name}</span>
                <span className="flex items-center gap-1">
                  <Input
                    className="h-8 w-16 text-right"
                    value={rates[branch.id] ?? ""}
                    onChange={(e) => setRates((prev) => ({ ...prev, [branch.id]: e.target.value }))}
                  />
                  <span className="text-muted-foreground">%</span>
                </span>
              </label>
            ))}
        </div>
      </section>

      <section className="space-y-3 rounded-xl border bg-card p-4">
        <div>
          <h2 className="text-sm font-semibold">Tali komisyonu</h2>
          <p className="text-muted-foreground text-xs">
            Seçilen talilere, branş komisyonunun bu kadarlık kısmı verilir. Kalanı acentede kalır.
          </p>
        </div>
        <label className="flex max-w-xs items-center gap-2 text-sm">
          <span>Tali payı</span>
          <Input className="h-9 w-20" value={taliShare} onChange={(e) => setTaliShare(e.target.value)} />
          <span className="text-muted-foreground">%</span>
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          {producers.map((producer) => (
            <label key={producer.id} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(taliChecked[producer.id])}
                onChange={(e) =>
                  setTaliChecked((prev) => ({ ...prev, [producer.id]: e.target.checked }))
                }
              />
              <span>
                {producer.name}
                {foldTurkish(producer.name) === "NURDAN" ? (
                  <span className="text-muted-foreground"> · acente</span>
                ) : null}
              </span>
            </label>
          ))}
        </div>
        <Button onClick={save}>Oranları kaydet</Button>
      </section>

      <section className="space-y-3 rounded-xl border bg-card p-4">
        <h2 className="text-sm font-semibold">Vergi / fon kesintileri</h2>
        <ul className="text-muted-foreground space-y-1 text-sm">
          <li>Gider vergisi (BSMV): {formatPercent(RATES.giderVergisi)} — kasko, trafik, konut</li>
          <li>G.H.K. payı: {formatPercent(RATES.ghk)} — zorunlu trafik (ZMSS neti)</li>
          <li>T.H.G. fonu: {formatPercent(RATES.thgf)} — zorunlu trafik (ZMSS neti)</li>
          <li>Y.S.V.: {formatPercent(RATES.ysv)} — konut yangın primi</li>
          <li>DASK, TSS, seyahat sağlık: net = brüt</li>
        </ul>
      </section>

      <section className="space-y-3 rounded-xl border bg-card p-4">
        <h2 className="text-sm font-semibold">Katalog</h2>
        <p className="text-sm">
          {partajlar.length} partaj · {branches.length} branş · {producers.length} kişi · {policies.length} poliçe
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
        <h2 className="text-sm font-semibold">Yedekleme ve şablonlar</h2>
        <div className="flex flex-wrap gap-2">
          <ImportDialog triggerLabel="Excel içe aktar" />
          <Button variant="outline" onClick={() => downloadBuffer(policiesToWorkbook(policies), "sigorta-yedek.xlsx")}>
            Excel yedek al
          </Button>
          <Button variant="outline" onClick={() => downloadBuffer(emptyPolicyTemplate("aktif"), "police-sablonu.xlsx")}>
            Poliçe şablonu
          </Button>
          <Button variant="outline" onClick={() => downloadBuffer(emptyPolicyTemplate("iptal"), "iptal-sablonu.xlsx")}>
            İptal şablonu
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
