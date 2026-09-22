"use client";

import { PageHeader } from "@/components/page-header";
import { CustomerForm } from "@/components/customer-form";

export default function NewCustomerPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Yeni müşteri"
        description="Ruhsat, noter satış veya poliçe görseli yükleyin; kimlik ve plaka otomatik dolar. İsterseniz elle de doldurun."
      />
      <CustomerForm />
    </div>
  );
}
