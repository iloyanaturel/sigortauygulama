"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { PolicyForm } from "@/components/policy-form";
import { Button } from "@/components/ui/button";
import { useAppData } from "@/hooks/use-app-data";
import { getDb } from "@/lib/store";

export default function PolicyDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { partajlar, branches, producers, policies, settings, customers } = useAppData();
  const policy = policies.find((item) => item.id === params.id);

  if (!policy) {
    return <p>Poliçe bulunamadı.</p>;
  }

  async function remove() {
    if (!confirm("Bu poliçe silinsin mi?")) return;
    await getDb().policies.delete(params.id);
    toast.success("Poliçe silindi.");
    router.push("/policeler");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{policy.customerName}</h1>
          <p className="text-muted-foreground text-sm">
            {policy.partaj} · {policy.branch} · {policy.policyNo || "Poliçe no yok"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/policeler">Listeye dön</Link>
          </Button>
          <Button variant="destructive" onClick={remove}>
            Sil
          </Button>
        </div>
      </div>
      <PolicyForm
        policy={policy}
        partajlar={partajlar}
        branches={branches}
        producers={producers}
        settings={settings}
        customers={customers}
      />
    </div>
  );
}
