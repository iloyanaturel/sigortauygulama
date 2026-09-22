"use client";

import Link from "next/link";
import { PolicyForm } from "@/components/policy-form";
import { ImportDialog } from "@/components/import-dialog";
import { Button } from "@/components/ui/button";
import { useAppData } from "@/hooks/use-app-data";
import { emptyPolicyTemplate } from "@/lib/excel";

function downloadTemplate() {
  const buf = emptyPolicyTemplate("iptal");
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "iptal-police-sablonu.xlsx";
  a.click();
  URL.revokeObjectURL(url);
}

export default function CancelPolicyPage() {
  const { partajlar, branches, producers, settings, policies, ready } = useAppData();
  if (!ready) return <p className="text-muted-foreground text-sm">Yükleniyor…</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">İptal poliçesi</h1>
          <p className="text-muted-foreground max-w-2xl text-sm">
            İptal poliçeleri aktif kayıtlardan ayrı tutulur. Prim ve komisyonu eksi yazın. Poliçe PDF’si,
            noter satış JPEG/PNG görseli veya Excel şablonu yükleyebilirsiniz.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={downloadTemplate}>
            Excel şablonu
          </Button>
          <ImportDialog triggerLabel="İptal Excel’i yükle" />
          <Button variant="outline" asChild>
            <Link href="/policeler?durum=iptal">İptal listesi</Link>
          </Button>
        </div>
      </div>
      <PolicyForm
        template="cancel"
        partajlar={partajlar}
        branches={branches}
        producers={producers}
        settings={settings}
        existingPolicies={policies}
      />
    </div>
  );
}
