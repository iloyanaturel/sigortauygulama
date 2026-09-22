"use client";

import { useMemo, useState } from "react";
import { MoneyInput } from "@/components/money-input";
import { PremiumBreakdownCard } from "@/components/premium-breakdown";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/searchable-select";
import { DEFAULT_BRANCHES, profileForBranch } from "@/lib/catalog";
import { calculatePremium, netFromGross } from "@/lib/premiums";
import type { CalcProfile } from "@/lib/types";

const PROFILES: Array<{ label: string; profile: CalcProfile }> = [
  { label: "Trafik", profile: "trafik" },
  { label: "Kasko", profile: "kasko" },
  { label: "Konut", profile: "konut" },
  { label: "DASK / TSS / seyahat", profile: "exempt" },
];

export default function CalculatorPage() {
  const [branch, setBranch] = useState("Trafik");
  const [net, setNet] = useState<number | null>(5804.81);
  const [gross, setGross] = useState<number | null>(null);
  const [compulsory, setCompulsory] = useState<number | null>(5199);
  const [fire, setFire] = useState<number | null>(null);
  const profile = profileForBranch(branch, DEFAULT_BRANCHES);

  const breakdown = useMemo(() => {
    const netPremium =
      gross !== null && gross > 0
        ? netFromGross(profile, gross, {
            profile,
            netPremium: gross,
            compulsoryNet: compulsory,
            firePremium: fire,
          })
        : (net ?? 0);
    return calculatePremium({
      profile,
      netPremium,
      compulsoryNet: compulsory,
      firePremium: fire,
    });
  }, [profile, net, gross, compulsory, fire]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Prim hesap</h1>
        <p className="text-muted-foreground text-sm">
          Net veya brüt girin; branşa göre G.H.K., gider vergisi, T.H.G. fonu ve Y.S.V. hesaplanır.
        </p>
      </div>
      <div className="grid gap-4 rounded-xl border bg-card p-4 md:grid-cols-2">
        <div>
          <Label className="mb-1.5 block">Branş</Label>
          <SearchableSelect
            value={branch}
            onChange={setBranch}
            allowCreate={false}
            placeholder="Branş"
            options={PROFILES.map((p) => ({ value: p.profile, label: p.label }))}
          />
        </div>
        <div>
          <Label className="mb-1.5 block">Net prim</Label>
          <MoneyInput
            value={net}
            onChange={(v) => {
              setNet(v);
              setGross(null);
            }}
          />
        </div>
        <div>
          <Label className="mb-1.5 block">Brüt prim (opsiyonel, neti geri hesaplar)</Label>
          <MoneyInput
            value={gross}
            onChange={(v) => {
              setGross(v);
            }}
          />
        </div>
        {profile === "trafik" ? (
          <div>
            <Label className="mb-1.5 block">ZMSS neti</Label>
            <MoneyInput value={compulsory} onChange={setCompulsory} />
          </div>
        ) : null}
        {profile === "konut" ? (
          <div>
            <Label className="mb-1.5 block">Yangın primi</Label>
            <MoneyInput value={fire} onChange={setFire} />
          </div>
        ) : null}
      </div>
      <PremiumBreakdownCard breakdown={breakdown} />
    </div>
  );
}
