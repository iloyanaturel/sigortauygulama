"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { DocumentDropzone, PdfSummary } from "@/components/pdf-dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { uid } from "@/lib/id";
import { formatPlate } from "@/lib/text";
import { saveCustomer } from "@/lib/store";
import type { Customer } from "@/lib/types";
import type { ParsedPolicyDraft } from "@/lib/pdf-policy";

function emptyCustomer(): Customer {
  const now = new Date().toISOString();
  return {
    id: uid(),
    createdAt: now,
    updatedAt: now,
    name: "",
    nationalId: "",
    phone: "",
    birthDate: "",
    address: "",
    plates: [],
    documentSerial: "",
    notes: "",
    source: "manual",
  };
}

export function CustomerForm({ customer }: { customer?: Customer }) {
  const router = useRouter();
  const [form, setForm] = useState<Customer>(() => customer ?? emptyCustomer());
  const [plateDraft, setPlateDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<ParsedPolicyDraft | null>(null);

  function applyParsed(parsed: ParsedPolicyDraft) {
    setDraft(parsed);
    setForm((prev) => ({
      ...prev,
      name: parsed.customerName || parsed.sellerName || prev.name,
      nationalId: parsed.nationalId || prev.nationalId,
      phone: parsed.phone || prev.phone,
      birthDate: parsed.birthDate || prev.birthDate,
      address: parsed.address || prev.address,
      documentSerial: parsed.documentSerial || prev.documentSerial,
      plates: parsed.plate
        ? [...new Set([...prev.plates, formatPlate(parsed.plate)])]
        : prev.plates,
      notes: [prev.notes, parsed.notes].filter(Boolean).join(" · "),
      source: parsed.documentKind || prev.source,
    }));
    toast.success("Ruhsat / belge okundu, kaydı kontrol edin.");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Müşteri adını girin.");
      return;
    }
    setSaving(true);
    try {
      const plates = form.plates.slice();
      if (plateDraft.trim()) plates.push(formatPlate(plateDraft));
      await saveCustomer({
        ...form,
        name: form.name.trim(),
        nationalId: form.nationalId.replace(/\D/g, "").slice(0, 11),
        plates: [...new Set(plates.filter(Boolean))],
      });
      toast.success(customer ? "Müşteri güncellendi." : "Müşteri kaydedildi.");
      router.push("/musteriler");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-3xl gap-6">
      {!customer ? (
        <section className="space-y-3">
          <DocumentDropzone mode="new" onParsed={(parsed) => applyParsed(parsed)} />
          {draft ? <PdfSummary draft={draft} /> : null}
          <p className="text-muted-foreground text-xs">
            Ruhsat, noter satış veya poliçe fotoğrafı / PDF yükleyerek müşteri kartını doldurun.
          </p>
        </section>
      ) : null}
      <section className="grid gap-4 rounded-xl border bg-card p-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Label className="mb-1.5 block">Ad soyad / unvan</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <Label className="mb-1.5 block">T.C. kimlik no</Label>
          <Input
            inputMode="numeric"
            maxLength={11}
            value={form.nationalId}
            onChange={(e) => setForm({ ...form, nationalId: e.target.value.replace(/\D/g, "").slice(0, 11) })}
          />
        </div>
        <div>
          <Label className="mb-1.5 block">Telefon</Label>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div>
          <Label className="mb-1.5 block">Doğum tarihi</Label>
          <Input type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
        </div>
        <div>
          <Label className="mb-1.5 block">Ruhsat / belge seri no</Label>
          <Input value={form.documentSerial} onChange={(e) => setForm({ ...form, documentSerial: e.target.value })} />
        </div>
        <div className="md:col-span-2">
          <Label className="mb-1.5 block">Adres</Label>
          <Textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
        <div className="md:col-span-2">
          <Label className="mb-1.5 block">Plakalar</Label>
          <div className="mb-2 flex flex-wrap gap-2">
            {form.plates.map((plate) => (
              <button
                type="button"
                key={plate}
                className="rounded-full border px-2 py-1 text-xs"
                onClick={() => setForm({ ...form, plates: form.plates.filter((item) => item !== plate) })}
              >
                {plate} ×
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              className="h-9 uppercase"
              placeholder="34 ABC 123"
              value={plateDraft}
              onChange={(e) => setPlateDraft(e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (!plateDraft.trim()) return;
                setForm({ ...form, plates: [...new Set([...form.plates, formatPlate(plateDraft)])] });
                setPlateDraft("");
              }}
            >
              Plaka ekle
            </Button>
          </div>
        </div>
        <div className="md:col-span-2">
          <Label className="mb-1.5 block">Not</Label>
          <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
      </section>
      <Button type="submit" disabled={saving} className="w-fit">
        {customer ? "Değişiklikleri kaydet" : "Müşteriyi kaydet"}
      </Button>
    </form>
  );
}
