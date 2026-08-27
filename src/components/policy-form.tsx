"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { MoneyInput } from "@/components/money-input";
import { PremiumBreakdownCard } from "@/components/premium-breakdown";
import { SearchableSelect } from "@/components/searchable-select";
import {
  defaultCommissionForBranch,
  isPropertyBranch,
  isVehicleBranch,
  profileForBranch,
} from "@/lib/catalog";
import { defaultEndDate, todayISO } from "@/lib/dates";
import { uid } from "@/lib/id";
import { formatTRY, round2 } from "@/lib/money";
import { calculatePremium, netFromGross, suggestedCommission } from "@/lib/premiums";
import { getDb, upsertBranch, upsertCatalogName } from "@/lib/store";
import type { BranchItem, CatalogItem, Policy } from "@/lib/types";

type FormState = {
  issueDate: string;
  startDate: string;
  endDate: string;
  customerName: string;
  nationalId: string;
  phone: string;
  birthDate: string;
  partaj: string;
  branch: string;
  policyNo: string;
  plate: string;
  documentSerial: string;
  addressCode: string;
  daskNo: string;
  netPremium: number | null;
  compulsoryNet: number | null;
  firePremium: number | null;
  commission: number | null;
  producer: string;
  notes: string;
  status: Policy["status"];
  fromGross: boolean;
  grossOverride: number | null;
};

function initialState(policy?: Policy): FormState {
  if (!policy) {
    const today = todayISO();
    return {
      issueDate: today,
      startDate: today,
      endDate: defaultEndDate(today),
      customerName: "",
      nationalId: "",
      phone: "",
      birthDate: "",
      partaj: "",
      branch: "Trafik",
      policyNo: "",
      plate: "",
      documentSerial: "",
      addressCode: "",
      daskNo: "",
      netPremium: null,
      compulsoryNet: null,
      firePremium: null,
      commission: null,
      producer: "",
      notes: "",
      status: "aktif",
      fromGross: false,
      grossOverride: null,
    };
  }
  return {
    issueDate: policy.issueDate,
    startDate: policy.startDate,
    endDate: policy.endDate,
    customerName: policy.customerName,
    nationalId: policy.nationalId,
    phone: policy.phone,
    birthDate: policy.birthDate,
    partaj: policy.partaj,
    branch: policy.branch,
    policyNo: policy.policyNo,
    plate: policy.plate,
    documentSerial: policy.documentSerial,
    addressCode: policy.addressCode,
    daskNo: policy.daskNo,
    netPremium: policy.netPremium,
    compulsoryNet: policy.compulsoryNet,
    firePremium: policy.firePremium,
    commission: policy.commission,
    producer: policy.producer,
    notes: policy.notes,
    status: policy.status,
    fromGross: false,
    grossOverride: policy.grossPremium,
  };
}

export function PolicyForm({
  policy,
  partajlar,
  branches,
  producers,
}: {
  policy?: Policy;
  partajlar: CatalogItem[];
  branches: BranchItem[];
  producers: CatalogItem[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => initialState(policy));
  const [saving, setSaving] = useState(false);

  const profile = profileForBranch(form.branch, branches);
  const defaultRate = defaultCommissionForBranch(form.branch, branches);

  const breakdown = useMemo(() => {
    const net = form.fromGross
      ? netFromGross(profile, form.grossOverride ?? 0, {
          profile,
          netPremium: form.grossOverride ?? 0,
          compulsoryNet: form.compulsoryNet,
          firePremium: form.firePremium,
        })
      : (form.netPremium ?? 0);
    return calculatePremium({
      profile,
      netPremium: net,
      compulsoryNet: form.compulsoryNet,
      firePremium: form.firePremium,
    });
  }, [form, profile]);

  const commission =
    form.commission === null
      ? suggestedCommission(breakdown.netPremium, defaultRate)
      : form.commission;

  function patch(partial: Partial<FormState>) {
    setForm((prev) => {
      const next = { ...prev, ...partial };
      if (partial.startDate && !partial.endDate) {
        next.endDate = defaultEndDate(partial.startDate);
      }
      if (partial.branch && prev.commission === null) {
        next.commission = null;
      }
      return next;
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.partaj) {
      toast.error("Partaj seçin.");
      return;
    }
    if (!form.branch) {
      toast.error("Branş seçin.");
      return;
    }
    if (!form.customerName.trim()) {
      toast.error("Müşteri adını girin.");
      return;
    }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const record: Policy = {
        id: policy?.id ?? uid(),
        createdAt: policy?.createdAt ?? now,
        updatedAt: now,
        issueDate: form.issueDate,
        startDate: form.startDate,
        endDate: form.endDate,
        customerName: form.customerName.trim(),
        nationalId: form.nationalId.replace(/\D/g, "").slice(0, 11),
        phone: form.phone.trim(),
        birthDate: form.birthDate,
        partaj: form.partaj.trim(),
        branch: form.branch.trim(),
        policyNo: form.policyNo.trim(),
        plate: form.plate.trim().toLocaleUpperCase("tr-TR"),
        documentSerial: form.documentSerial.trim(),
        addressCode: form.addressCode.trim(),
        daskNo: form.daskNo.trim(),
        netPremium: breakdown.netPremium,
        compulsoryNet: profile === "trafik" ? (form.compulsoryNet ?? breakdown.netPremium) : null,
        firePremium: profile === "konut" ? form.firePremium : null,
        ghk: breakdown.ghk,
        thgf: breakdown.thgf,
        giderVergisi: breakdown.giderVergisi,
        ysv: breakdown.ysv,
        grossPremium: breakdown.grossPremium,
        commission,
        commissionRate: breakdown.netPremium ? round2(commission / breakdown.netPremium) : defaultRate,
        producer: form.producer.trim(),
        notes: form.notes.trim(),
        status: form.status,
      };
      await getDb().policies.put(record);
      await upsertCatalogName("partajlar", record.partaj);
      await upsertCatalogName("producers", record.producer);
      const branchMeta = branches.find((b) => b.name === record.branch);
      await upsertBranch(
        record.branch,
        branchMeta?.profile ?? profile,
        branchMeta?.defaultCommissionRate ?? defaultRate,
      );
      toast.success(policy ? "Poliçe güncellendi." : "Poliçe kaydedildi.");
      router.push("/policeler");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <section className="space-y-4 rounded-xl border bg-card p-4">
          <div>
            <h2 className="text-sm font-semibold">Önce bunları seçin</h2>
            <p className="text-muted-foreground text-xs">
              Partaj ve branş, prim hesabını ve komisyonu otomatik ayarlar.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Partaj">
              <SearchableSelect
                value={form.partaj}
                onChange={(partaj) => patch({ partaj })}
                placeholder="Şirket / partaj seçin"
                searchPlaceholder="Quick, Sompo, Hepiyi..."
                options={partajlar.map((p) => ({ value: p.id, label: p.name }))}
              />
            </Field>
            <Field label="Branş adı">
              <SearchableSelect
                value={form.branch}
                onChange={(branch) => patch({ branch })}
                placeholder="Branş seçin"
                searchPlaceholder="Trafik, kasko, konut..."
                options={branches.map((b) => ({
                  value: b.id,
                  label: b.name,
                  hint:
                    b.profile === "trafik"
                      ? "GHK + THGF + gider vergisi"
                      : b.profile === "konut"
                        ? "Gider vergisi + YSV"
                        : b.profile === "exempt"
                          ? "Vergisiz / net = brüt"
                          : "Gider vergisi %5",
                }))}
              />
            </Field>
          </div>
        </section>

        <section className="space-y-4 rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold">Müşteri</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Müşteri adı" className="md:col-span-2">
              <Input
                className="h-9"
                value={form.customerName}
                onChange={(e) => patch({ customerName: e.target.value })}
                placeholder="Ad soyad / unvan"
              />
            </Field>
            <Field label="T.C. kimlik no">
              <Input
                className="h-9"
                inputMode="numeric"
                maxLength={11}
                value={form.nationalId}
                onChange={(e) => patch({ nationalId: e.target.value.replace(/\D/g, "").slice(0, 11) })}
              />
            </Field>
            <Field label="Telefon">
              <Input
                className="h-9"
                value={form.phone}
                onChange={(e) => patch({ phone: e.target.value })}
              />
            </Field>
            <Field label="Doğum tarihi">
              <Input
                className="h-9"
                type="date"
                value={form.birthDate}
                onChange={(e) => patch({ birthDate: e.target.value })}
              />
            </Field>
            <Field label="Tali / kaynak">
              <SearchableSelect
                value={form.producer}
                onChange={(producer) => patch({ producer })}
                placeholder="Tali seçin (opsiyonel)"
                options={producers.map((p) => ({ value: p.id, label: p.name }))}
              />
            </Field>
          </div>
        </section>

        <section className="space-y-4 rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold">Poliçe bilgileri</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Tanzim tarihi">
              <Input
                className="h-9"
                type="date"
                value={form.issueDate}
                onChange={(e) => patch({ issueDate: e.target.value })}
              />
            </Field>
            <Field label="Vade başlangıç">
              <Input
                className="h-9"
                type="date"
                value={form.startDate}
                onChange={(e) => patch({ startDate: e.target.value })}
              />
            </Field>
            <Field label="Vade bitiş">
              <Input
                className="h-9"
                type="date"
                value={form.endDate}
                onChange={(e) => patch({ endDate: e.target.value })}
              />
            </Field>
            <Field label="Poliçe no" className="md:col-span-2">
              <Input
                className="h-9"
                value={form.policyNo}
                onChange={(e) => patch({ policyNo: e.target.value })}
              />
            </Field>
            {isVehicleBranch(form.branch) ? (
              <>
                <Field label="Plaka">
                  <Input
                    className="h-9 uppercase"
                    value={form.plate}
                    onChange={(e) => patch({ plate: e.target.value })}
                  />
                </Field>
                <Field label="Belge seri no">
                  <Input
                    className="h-9"
                    value={form.documentSerial}
                    onChange={(e) => patch({ documentSerial: e.target.value })}
                  />
                </Field>
              </>
            ) : null}
            {isPropertyBranch(form.branch) ? (
              <>
                <Field label="Adres kodu">
                  <Input
                    className="h-9"
                    value={form.addressCode}
                    onChange={(e) => patch({ addressCode: e.target.value })}
                  />
                </Field>
                <Field label="DASK / poliçe no">
                  <Input
                    className="h-9"
                    value={form.daskNo}
                    onChange={(e) => patch({ daskNo: e.target.value })}
                  />
                </Field>
              </>
            ) : null}
            <Field label="Durum">
              <SearchableSelect
                allowCreate={false}
                value={form.status === "aktif" ? "Aktif" : form.status === "iptal" ? "İptal" : "Zeyl"}
                onChange={(label) =>
                  patch({
                    status: label === "İptal" ? "iptal" : label === "Zeyl" ? "zeyl" : "aktif",
                  })
                }
                placeholder="Durum"
                options={[
                  { value: "aktif", label: "Aktif" },
                  { value: "iptal", label: "İptal" },
                  { value: "zeyl", label: "Zeyl" },
                ]}
              />
            </Field>
          </div>
        </section>

        <section className="space-y-4 rounded-xl border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Primler</h2>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={form.fromGross}
                onCheckedChange={(fromGross) => patch({ fromGross })}
              />
              Brütten net hesapla
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {form.fromGross ? (
              <Field label="Brüt prim">
                <MoneyInput
                  value={form.grossOverride}
                  onChange={(grossOverride) => patch({ grossOverride })}
                />
              </Field>
            ) : (
              <Field label="Net prim">
                <MoneyInput
                  value={form.netPremium}
                  onChange={(netPremium) => patch({ netPremium })}
                />
              </Field>
            )}
            {profile === "trafik" ? (
              <Field label="ZMSS neti (GHK / THGF matrahı)">
                <MoneyInput
                  value={form.compulsoryNet}
                  onChange={(compulsoryNet) => patch({ compulsoryNet })}
                />
                <p className="text-muted-foreground mt-1 text-xs">
                  Boş bırakılırsa toplam net prim kullanılır. Ek teminat varsa yalnızca zorunlu trafik netini girin.
                </p>
              </Field>
            ) : null}
            {profile === "konut" ? (
              <Field label="Yangın primi (YSV matrahı)">
                <MoneyInput
                  value={form.firePremium}
                  onChange={(firePremium) => patch({ firePremium })}
                />
                <p className="text-muted-foreground mt-1 text-xs">
                  Y.S.V. yangın priminin %10’udur. Bilinmiyorsa boş bırakın.
                </p>
              </Field>
            ) : null}
            <Field label={`Komisyon (önerilen ${Math.round(defaultRate * 100)}%)`}>
              <MoneyInput
                value={form.commission}
                onChange={(commission) => patch({ commission })}
              />
              <p className="text-muted-foreground mt-1 text-xs">
                Boşsa {formatTRY(suggestedCommission(breakdown.netPremium, defaultRate))} yazılır.
              </p>
            </Field>
          </div>
          <Field label="Not">
            <Textarea
              value={form.notes}
              onChange={(e) => patch({ notes: e.target.value })}
              rows={3}
            />
          </Field>
        </section>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
        <PremiumBreakdownCard breakdown={breakdown} />
        <div className="rounded-xl border bg-card px-4 py-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Komisyon</span>
            <span className="font-medium tabular-nums">{formatTRY(commission)}</span>
          </div>
        </div>
        <Button type="submit" className="h-10 w-full" disabled={saving}>
          {policy ? "Değişiklikleri kaydet" : "Poliçeyi kaydet"}
        </Button>
      </aside>
    </form>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block">{label}</Label>
      {children}
    </div>
  );
}
