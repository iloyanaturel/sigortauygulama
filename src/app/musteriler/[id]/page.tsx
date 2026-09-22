"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { CustomerForm } from "@/components/customer-form";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PolicyTable } from "@/components/policy-table";
import { useAppData } from "@/hooks/use-app-data";
import { deleteCustomer } from "@/lib/store";
import { foldTurkish } from "@/lib/text";

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { customers, policies } = useAppData();
  const customer = customers.find((item) => item.id === params.id);
  if (!customer) return <p>Müşteri bulunamadı.</p>;
  const customerId = customer.id;
  const related = policies.filter(
    (policy) =>
      policy.customerId === customer.id ||
      (customer.nationalId && policy.nationalId === customer.nationalId) ||
      foldTurkish(policy.customerName) === foldTurkish(customer.name),
  );

  async function remove() {
    if (!confirm("Müşteri kartı silinsin mi? Poliçeler durur.")) return;
    await deleteCustomer(customerId);
    toast.success("Müşteri silindi.");
    router.push("/musteriler");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={customer.name}
        description={[customer.nationalId, customer.phone, customer.plates.join(", ")].filter(Boolean).join(" · ")}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/musteriler">Listeye dön</Link>
            </Button>
            <Button variant="destructive" onClick={() => void remove()}>
              Sil
            </Button>
          </>
        }
      />
      <CustomerForm customer={customer} />
      <div className="space-y-2">
        <h2 className="text-sm font-semibold">Poliçeler</h2>
        {related.length ? (
          <PolicyTable policies={related} />
        ) : (
          <p className="text-muted-foreground text-sm">Bu müşteriye bağlı poliçe yok.</p>
        )}
      </div>
    </div>
  );
}
