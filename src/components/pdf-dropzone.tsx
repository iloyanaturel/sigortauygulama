"use client";

import { useState } from "react";
import { FileUpIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { parseUploadedFile } from "@/lib/document-extract";
import { isImageFile, isPdfFile } from "@/lib/document-parse";
import { notaryPartyForMode } from "@/lib/notary-sale";
import { formatTRY } from "@/lib/money";
import { formatTRDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { ParsedPolicyDraft } from "@/lib/pdf-policy";

const ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,.bmp,.tif,.tiff,application/pdf,image/*";

export function DocumentDropzone({
  onParsed,
  compact = false,
  mode = "new",
}: {
  onParsed: (draft: ParsedPolicyDraft, fileName: string) => void;
  compact?: boolean;
  mode?: "new" | "cancel";
}) {
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [progress, setProgress] = useState<string>("");

  async function handleFiles(list: FileList | File[] | undefined) {
    const files = [...(list ?? [])].filter((file) => isPdfFile(file) || isImageFile(file));
    if (!files.length) {
      toast.error("PDF, JPEG, PNG veya WebP yükleyin.");
      return;
    }
    setBusy(true);
    setProgress(files.some(isImageFile) ? "Görsel okunuyor…" : "PDF okunuyor…");
    try {
      let merged: ParsedPolicyDraft | null = null;
      const names: string[] = [];
      for (const file of files) {
        names.push(file.name);
        const parsed = await parseUploadedFile(file, () => {
          setProgress("Metin tanınıyor…");
        });
        merged = mergeDrafts(merged, parsed);
      }
      if (!merged) return;
      const fileName = names.join(", ");
      const hasCore =
        merged.customerName || merged.policyNo || merged.netPremium || merged.plate || merged.sellerName || merged.buyerName;
      if (!hasCore) {
        toast.error("Belge okundu ama poliçe / noter bilgisi bulunamadı. Elle doldurabilirsiniz.");
        return;
      }
      if (merged.documentKind === "notary-sale") {
        const party = notaryPartyForMode(merged, mode);
        merged = {
          ...merged,
          status: mode === "cancel" ? "iptal" : merged.status,
          customerName: party.name,
          nationalId: party.nationalId,
        };
      }
      onParsed(merged, fileName);
      if (merged.warnings.length) toast.warning(merged.warnings.slice(0, 2).join(" "));
      else if (merged.documentKind === "notary-sale") {
        toast.success("Noter satış sözleşmesi okundu, formu kontrol edip kaydedin.");
      } else {
        toast.success("PDF okundu, formu kontrol edip kaydedin.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Belge okunamadı. Daha net bir fotoğraf veya PDF deneyin.");
    } finally {
      setBusy(false);
      setProgress("");
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
        void handleFiles(e.dataTransfer.files);
      }}
    >
      {busy ? <Loader2Icon className="size-8 animate-spin" /> : <FileUpIcon className="size-8 opacity-80" />}
      <div>
        <p className="text-sm font-medium">Poliçe PDF veya noter satış görseli yükleyin</p>
        <p className="text-muted-foreground mt-1 text-xs">
          {mode === "cancel"
            ? "İptal için PDF, JPEG, PNG veya noter satış sözleşmesi fotoğrafı. Plaka eşleşirse mevcut poliçe doldurulur."
            : "Trafik, kasko, konut, DASK, TSS PDF’leri ve JPEG/PNG noter satış sözleşmeleri otomatik dolar."}
        </p>
        {progress ? <p className="text-primary mt-2 text-xs">{progress}</p> : null}
      </div>
      <input
        type="file"
        accept={ACCEPT}
        multiple
        className="sr-only"
        disabled={busy}
        onChange={(e) => {
          void handleFiles(e.target.files ?? undefined);
          e.currentTarget.value = "";
        }}
      />
    </label>
  );
}

export const PdfDropzone = DocumentDropzone;

export function PdfSummary({ draft }: { draft: ParsedPolicyDraft }) {
  const notary = draft.documentKind === "notary-sale";
  return (
    <div className="grid gap-2 rounded-xl border bg-muted/30 p-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
      <Summary k={notary ? "Belge" : "Müşteri"} v={notary ? "Noter satış sözleşmesi" : draft.customerName || "—"} />
      {notary ? <Summary k="Satıcı" v={draft.sellerName || "—"} /> : <Summary k="Partaj / branş" v={`${draft.partaj || "—"} · ${draft.branch || "—"}`} />}
      {notary ? <Summary k="Alıcı" v={draft.buyerName || "—"} /> : <Summary k="Poliçe no" v={draft.policyNo || "—"} />}
      <Summary k="Vade / tarih" v={`${formatTRDate(draft.startDate)} – ${formatTRDate(draft.endDate)}`} />
      <Summary k="Net prim" v={formatTRY(draft.netPremium)} />
      <Summary k="Brüt prim" v={formatTRY(draft.grossPremium)} />
      <Summary k="Plaka" v={draft.plate || "—"} />
      <Summary k="DASK / adres" v={draft.daskNo || draft.addressCode || "—"} />
    </div>
  );
}

function mergeDrafts(base: ParsedPolicyDraft | null, extra: ParsedPolicyDraft): ParsedPolicyDraft {
  if (!base) return extra;
  return {
    ...base,
    ...Object.fromEntries(Object.entries(extra).filter(([, value]) => value !== "" && value !== null && value !== undefined)),
    warnings: [...base.warnings, ...extra.warnings],
    notes: [base.notes, extra.notes].filter(Boolean).join(" · "),
    documentKind: extra.documentKind === "notary-sale" || base.documentKind === "notary-sale" ? "notary-sale" : extra.documentKind,
  } as ParsedPolicyDraft;
}

function Summary({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <p className="text-muted-foreground">{k}</p>
      <p className="font-medium">{v}</p>
    </div>
  );
}
