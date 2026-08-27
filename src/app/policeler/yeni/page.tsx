"use client";

import { PolicyForm } from "@/components/policy-form";
import { useAppData } from "@/hooks/use-app-data";

export default function NewPolicyPage() {
  const { partajlar, branches, producers, ready } = useAppData();
  if (!ready) return <p className="text-muted-foreground text-sm">Yükleniyor…</p>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Yeni poliçe</h1>
        <p className="text-muted-foreground text-sm">
          Partaj ve branşı seçin, net primi girin. Trafik, kasko ve konut kesintileri anında hesaplanır.
        </p>
      </div>
      <PolicyForm partajlar={partajlar} branches={branches} producers={producers} />
    </div>
  );
}
