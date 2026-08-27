export function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function parseTRNumber(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? raw : null;
  }
  let s = String(raw).trim();
  if (!s || s === "-" || s.toLowerCase() === "nan") return null;
  s = s.replace(/tl/gi, "").replace(/\s/g, "").replace(/\u00a0/g, "");
  const negative = s.startsWith("-") || s.startsWith("(");
  s = s.replace(/[()]/g, "");

  if (/\d+\.\d{3}/.test(s) && s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(",") && s.includes(".")) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (s.includes(",")) {
    s = s.replace(",", ".");
  }

  s = s.replace(/[^0-9.\-]/g, "");
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negative && n > 0 ? -n : n;
}

export function formatTRY(value: number | null | undefined, options?: { withSymbol?: boolean }): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const formatted = new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(round2(value));
  return options?.withSymbol === false ? formatted : `${formatted} TL`;
}

export function formatPercent(rate: number): string {
  return `%${new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(round2(rate * 100))}`;
}
