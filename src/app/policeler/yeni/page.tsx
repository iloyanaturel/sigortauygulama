"use client";

import { PolicyForm } from "@/components/policy-form";
import { useAppData } from "@/hooks/use-app-data";

export default function NewPolicyPage() {
  const { partajlar, branches, producers, settings, policies, ready } = useAppData();
  if (!ready) return <p className="text-muted-foreground text-sm">Yükleniyor…</p>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Yeni poliçe</h1>
        <p className="text-muted-foreground text-sm">
          Poliçe PDF’si veya noter satış sözleşmesi (JPEG/PNG) yükleyin; alanlar otomatik dolar.
        </p>
      </div>
      <PolicyForm
        partajlar={partajlar}
        branches={branches}
        producers={producers}
        settings={settings}
        existingPolicies={policies}
      />
    </div>
  );
}
