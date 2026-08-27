"use client";

import { useState } from "react";
import { FileUpIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { parsePolicyPdf } from "@/lib/pdf-extract";
import { formatTRY } from "@/lib/money";
import { formatTRDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { ParsedPolicyDraft } from "@/lib/pdf-policy";

export function PdfDropzone({
  onParsed,
  compact = false,
}: {
  onParsed: (draft: ParsedPolicyDraft, fileName: string) => void;
  compact?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Lütfen bir PDF poliçe dosyası yükleyin.");
      return;
    }
    setBusy(true);
    try {
      const draft = await parsePolicyPdf(await file.arrayBuffer());
      if (!draft.customerName && !draft.policyNo && !draft.netPremium) {
        toast.error("PDF okundu ama poliçe bilgisi bulunamadı. Elle doldurabilirsiniz.");
        return;
      }
      onParsed(draft, file.name);
      if (draft.warnings.length) {
        toast.warning(draft.warnings.join(" "));
      } else {
        toast.success("PDF okundu, formu kontrol edip kaydedin.");
      }
    } catch (error) {
      console.error(error);
      toast.error("PDF okunamadı. Farklı bir tarama / metin PDF deneyin.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <label
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 text-center transition-colors",
        compact ? "py-6" : "py-10",
        drag ? "border-primary bg-primary/10" : "bg-card hover:border-primary/60",
        busy && "pointer-events-none opacity-70",
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        void handleFile(e.dataTransfer.files?.[0]);
      }}
    >
      {busy ? <Loader2Icon className="size-8 animate-spin" /> : <FileUpIcon className="size-8 opacity-80" />}
      <div>
        <p className="text-sm font-medium">Poliçe PDF’ini buraya bırakın veya seçin</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Trafik, kasko, konut, DASK ve TSS poliçelerinden müşteri, prim ve tarih alanları otomatik dolar.
        </p>
      </div>
      <input
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        disabled={busy}
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.currentTarget.value = "";
        }}
      />
    </label>
  );
}

export function PdfSummary({ draft }: { draft: ParsedPolicyDraft }) {
  return (
    <div className="grid gap-2 rounded-xl border bg-muted/30 p-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
      <Summary k="Müşteri" v={draft.customerName || "—"} />
      <Summary k="Partaj / branş" v={`${draft.partaj || "—"} · ${draft.branch || "—"}`} />
      <Summary k="Poliçe no" v={draft.policyNo || "—"} />
      <Summary k="Vade" v={`${formatTRDate(draft.startDate)} – ${formatTRDate(draft.endDate)}`} />
      <Summary k="Net prim" v={formatTRY(draft.netPremium)} />
      <Summary k="Brüt prim" v={formatTRY(draft.grossPremium)} />
      <Summary k="Plaka" v={draft.plate || "—"} />
      <Summary k="DASK / adres" v={draft.daskNo || draft.addressCode || "—"} />
    </div>
  );
}

function Summary({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <p className="text-muted-foreground">{k}</p>
      <p className="font-medium">{v}</p>
    </div>
  );
}
