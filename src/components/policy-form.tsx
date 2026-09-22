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
import { PdfDropzone, PdfSummary } from "@/components/pdf-dropzone";
import {
  defaultCommissionForBranch,
  isPropertyBranch,
  isVehicleBranch,
  profileForBranch,
} from "@/lib/catalog";
import { isTaliProducer, splitCommission } from "@/lib/commission";
import { defaultEndDate, todayISO } from "@/lib/dates";
import { uid } from "@/lib/id";
import { formatPercent, formatTRY, round2 } from "@/lib/money";
import { calculatePremium, netFromGross, suggestedCommission } from "@/lib/premiums";
import { getDb, upsertBranch, upsertCatalogName } from "@/lib/store";
import { mergeSettings } from "@/lib/settings";
import type { AppSettings, BranchItem, CatalogItem, Policy } from "@/lib/types";
import type { ParsedPolicyDraft } from "@/lib/pdf-policy";
import { notaryPartyForMode } from "@/lib/notary-sale";
import { plateKey } from "@/lib/text";

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
  cancelDate: string;
  cancelReason: string;
  printedGiderVergisi: number | null;
  printedGhk: number | null;
  printedThgf: number | null;
  printedYsv: number | null;
};

function initialState(policy?: Policy, template: "new" | "cancel" = "new"): FormState {
  const today = todayISO();
  if (!policy) {
    return {
      issueDate: today,
      startDate: today,
      endDate: defaultEndDate(today),
      customerName: "",
      nationalId: "",
      phone: "",
      birthDate: "",
      partaj: "",
      branch: template === "cancel" ? "Trafik" : "Trafik",
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
      status: template === "cancel" ? "iptal" : "aktif",
      fromGross: false,
      grossOverride: null,
      cancelDate: template === "cancel" ? today : "",
      cancelReason: "",
      printedGiderVergisi: null,
      printedGhk: null,
      printedThgf: null,
      printedYsv: null,
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
    cancelDate: policy.cancelDate ?? "",
    cancelReason: policy.cancelReason ?? "",
    printedGiderVergisi: policy.giderVergisi,
    printedGhk: policy.ghk,
    printedThgf: policy.thgf,
    printedYsv: policy.ysv,
  };
}

function applyDraft(
  prev: FormState,
  draft: ParsedPolicyDraft,
  fileName: string,
  options?: { template?: "new" | "cancel"; existing?: Policy[] },
): FormState {
  const notary = draft.documentKind === "notary-sale";
  const template = options?.template ?? "new";
  const plate = draft.plate || prev.plate;
  const matched = plate
    ? options?.existing?.find(
        (item) => plateKey(item.plate) === plateKey(plate) && (template === "cancel" ? item.status !== "iptal" : true),
      )
    : undefined;
  const party = notary ? notaryPartyForMode(draft, template) : { name: draft.customerName, nationalId: draft.nationalId };
  const next: FormState = {
    ...prev,
    issueDate: draft.issueDate || matched?.issueDate || prev.issueDate,
    startDate: draft.startDate || matched?.startDate || prev.startDate,
    endDate: draft.endDate || matched?.endDate || prev.endDate,
    customerName: party.name || matched?.customerName || prev.customerName,
    nationalId: party.nationalId || matched?.nationalId || prev.nationalId,
    phone: draft.phone || matched?.phone || prev.phone,
    birthDate: draft.birthDate || matched?.birthDate || prev.birthDate,
    partaj: draft.partaj || matched?.partaj || prev.partaj,
    branch: draft.branch || matched?.branch || prev.branch,
    policyNo: notary ? matched?.policyNo || prev.policyNo : draft.policyNo || matched?.policyNo || prev.policyNo,
    plate,
    documentSerial: notary
      ? matched?.documentSerial || prev.documentSerial
      : draft.documentSerial || matched?.documentSerial || prev.documentSerial,
    producer: prev.producer || matched?.producer || "",
    addressCode: draft.addressCode || matched?.addressCode || prev.addressCode,
    daskNo: draft.daskNo || matched?.daskNo || prev.daskNo,
    netPremium: draft.netPremium ?? (matched && template === "cancel" ? -Math.abs(matched.netPremium) : prev.netPremium),
    compulsoryNet:
      draft.compulsoryNet ?? (matched && template === "cancel" ? matched.compulsoryNet : prev.compulsoryNet),
    firePremium: draft.firePremium ?? (matched && template === "cancel" ? matched.firePremium : prev.firePremium),
    commission:
      matched && template === "cancel" ? -Math.abs(matched.commission) : prev.commission,
    notes: [prev.notes, draft.notes, fileName].filter(Boolean).join(" · "),
    status: template === "cancel" || draft.status === "iptal" ? "iptal" : prev.status,
    fromGross: false,
    grossOverride:
      draft.grossPremium ?? (matched && template === "cancel" ? -Math.abs(matched.grossPremium) : prev.grossOverride),
    printedGiderVergisi: draft.giderVergisi,
    printedGhk: draft.ghk,
    printedThgf: draft.thgf,
    printedYsv: draft.ysv,
    cancelDate: template === "cancel" ? draft.issueDate || prev.cancelDate : prev.cancelDate,
    cancelReason:
      template === "cancel"
        ? prev.cancelReason || (notary ? "Noter satışı" : "Poliçe iptali")
        : prev.cancelReason,
  };
  return next;
}

export function PolicyForm({
  policy,
  partajlar,
  branches,
  producers,
  settings,
  template = "new",
  existingPolicies = [],
}: {
  policy?: Policy;
  partajlar: CatalogItem[];
  branches: BranchItem[];
  producers: CatalogItem[];
  settings?: AppSettings;
  template?: "new" | "cancel";
  existingPolicies?: Policy[];
}) {
  const router = useRouter();
  const merged = mergeSettings(settings);
  const [form, setForm] = useState<FormState>(() => initialState(policy, template));
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<ParsedPolicyDraft | null>(null);

  const profile = profileForBranch(form.branch, branches);
  const defaultRate = defaultCommissionForBranch(form.branch, branches);

  const breakdown = useMemo(() => {
    const net = form.fromGross
      ? netFromGross(profile, form.grossOverride ?? 0, {
          profile,
          netPremium: form.grossOverride ?? 0,
          compulsoryNet: form.compulsoryNet,
          firePremium: form.firePremium,
          ysvAmount: form.printedYsv,
        })
      : (form.netPremium ?? 0);
    return calculatePremium({
      profile,
      netPremium: net,
      compulsoryNet: form.compulsoryNet,
      firePremium: form.firePremium,
      ysvAmount: form.printedYsv,
      giderVergisiAmount: form.printedGiderVergisi,
      ghkAmount: form.printedGhk,
      thgfAmount: form.printedThgf,
      grossAmount: form.fromGross ? form.grossOverride : form.grossOverride,
    });
  }, [form, profile]);

  const commission =
    form.commission === null
      ? suggestedCommission(breakdown.netPremium, defaultRate)
      : form.commission;
  const split = splitCommission(commission, form.producer, merged);

  function patch(partial: Partial<FormState>) {
    setForm((prev) => {
      const next = { ...prev, ...partial };
      if (partial.startDate && !partial.endDate) {
        next.endDate = defaultEndDate(partial.startDate);
      }
      if (partial.branch && prev.commission === null) {
        next.commission = null;
      }
      if (partial.netPremium !== undefined && partial.printedGiderVergisi === undefined) {
        next.printedGiderVergisi = null;
        next.printedGhk = null;
        next.printedThgf = null;
        next.printedYsv = null;
        if (!partial.grossOverride) next.grossOverride = null;
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
      const status = template === "cancel" ? "iptal" : form.status;
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
        producerCommission: split.producerCommission,
        agencyCommission: split.agencyCommission,
        producer: form.producer.trim(),
        notes: form.notes.trim(),
        status,
        cancelDate: status === "iptal" ? form.cancelDate : "",
        cancelReason: status === "iptal" ? form.cancelReason.trim() : "",
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
      toast.success(policy ? "Poliçe güncellendi." : status === "iptal" ? "İptal poliçesi kaydedildi." : "Poliçe kaydedildi.");
      router.push(status === "iptal" ? "/policeler?durum=iptal" : "/policeler");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        {!policy ? (
          <section className="space-y-3">
            <PdfDropzone
              mode={template}
              onParsed={(parsed, fileName) => {
                setDraft(parsed);
                setForm((prev) => applyDraft(prev, parsed, fileName, { template, existing: existingPolicies }));
              }}
            />
            {draft ? <PdfSummary draft={draft} /> : null}
          </section>
        ) : null}

        <section className="space-y-4 rounded-xl border bg-card p-4">
          <div>
            <h2 className="text-sm font-semibold">Önce bunları seçin</h2>
            <p className="text-muted-foreground text-xs">
              Partaj ve branş, prim hesabını ve komisyon oranını otomatik ayarlar.
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
                  hint: `${Math.round(b.defaultCommissionRate * 100)}% komisyon`,
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
              <Input className="h-9" value={form.phone} onChange={(e) => patch({ phone: e.target.value })} />
            </Field>
            <Field label="Doğum tarihi">
              <Input
                className="h-9"
                type="date"
                value={form.birthDate}
                onChange={(e) => patch({ birthDate: e.target.value })}
              />
            </Field>
            <Field label="Tali">
              <SearchableSelect
                value={form.producer}
                onChange={(producer) => patch({ producer })}
                placeholder="Tali yoksa boş bırakın"
                options={producers.map((p) => ({
                  value: p.id,
                  label: p.name,
                  hint: isTaliProducer(p.name, merged)
                    ? `Toplam komisyonun %${Math.round(merged.taliShareRate * 100)}’i`
                    : "Acente işi",
                }))}
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
              <Input className="h-9" value={form.policyNo} onChange={(e) => patch({ policyNo: e.target.value })} />
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
                <Field label="DASK no">
                  <Input className="h-9" value={form.daskNo} onChange={(e) => patch({ daskNo: e.target.value })} />
                </Field>
              </>
            ) : null}
            {template === "cancel" || form.status === "iptal" ? (
              <>
                <Field label="İptal tarihi">
                  <Input
                    className="h-9"
                    type="date"
                    value={form.cancelDate}
                    onChange={(e) => patch({ cancelDate: e.target.value, status: "iptal" })}
                  />
                </Field>
                <Field label="İptal nedeni" className="md:col-span-2">
                  <Input
                    className="h-9"
                    value={form.cancelReason}
                    onChange={(e) => patch({ cancelReason: e.target.value, status: "iptal" })}
                    placeholder="Müşteri talebi, satış iptali..."
                  />
                </Field>
              </>
            ) : (
              <Field label="Durum">
                <SearchableSelect
                  allowCreate={false}
                  value={form.status === "zeyl" ? "Zeyl" : "Aktif"}
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
            )}
          </div>
        </section>

        <section className="space-y-4 rounded-xl border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Primler</h2>
              <p className="text-muted-foreground text-xs">
                {template === "cancel"
                  ? "İptal primleri genelde eksi yazılır. Komisyon da net prim üzerinden hesaplanır."
                  : `Komisyon net primin ${formatPercent(defaultRate)}’i. Oranı Ayarlar’dan değiştirebilirsiniz.`}
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.fromGross} onCheckedChange={(fromGross) => patch({ fromGross })} />
              Brütten net hesapla
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {form.fromGross ? (
              <Field label="Brüt prim">
                <MoneyInput value={form.grossOverride} onChange={(grossOverride) => patch({ grossOverride })} />
              </Field>
            ) : (
              <Field label="Net prim">
                <MoneyInput value={form.netPremium} onChange={(netPremium) => patch({ netPremium })} />
              </Field>
            )}
            {profile === "trafik" ? (
              <Field label="ZMSS neti (GHK / THGF matrahı)">
                <MoneyInput
                  value={form.compulsoryNet}
                  onChange={(compulsoryNet) => patch({ compulsoryNet })}
                />
              </Field>
            ) : null}
            {profile === "konut" ? (
              <Field label="Yangın primi (YSV matrahı)">
                <MoneyInput value={form.firePremium} onChange={(firePremium) => patch({ firePremium })} />
              </Field>
            ) : null}
            <Field label={`Toplam komisyon (önerilen ${Math.round(defaultRate * 100)}%)`}>
              <MoneyInput value={form.commission} onChange={(commission) => patch({ commission })} />
              <p className="text-muted-foreground mt-1 text-xs">
                Boşsa {formatTRY(suggestedCommission(breakdown.netPremium, defaultRate))} yazılır.
              </p>
            </Field>
          </div>
          <Field label="Not">
            <Textarea value={form.notes} onChange={(e) => patch({ notes: e.target.value })} rows={3} />
          </Field>
        </section>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
        <PremiumBreakdownCard breakdown={breakdown} />
        <div className="space-y-2 rounded-xl border bg-card px-4 py-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Toplam komisyon</span>
            <span className="font-medium tabular-nums">{formatTRY(split.total)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              Tali payı {split.tali ? formatPercent(merged.taliShareRate) : ""}
            </span>
            <span className="tabular-nums">{formatTRY(split.producerCommission)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Acente payı</span>
            <span className="tabular-nums">{formatTRY(split.agencyCommission)}</span>
          </div>
          {!form.producer ? (
            <p className="text-muted-foreground pt-1 text-xs">
              Tali seçilmezse komisyonun tamamı acentede kalır.
            </p>
          ) : null}
        </div>
        <Button type="submit" className="h-10 w-full" disabled={saving}>
          {policy
            ? "Değişiklikleri kaydet"
            : template === "cancel"
              ? "İptal poliçesini kaydet"
              : "Poliçeyi kaydet"}
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
