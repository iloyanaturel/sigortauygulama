import { addYears, format, isValid, parse, parseISO } from "date-fns";
import { tr } from "date-fns/locale";

export function toISODate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) {
    if (!isValid(value) || value.getFullYear() < 1990 || value.getFullYear() > 2040) {
      return null;
    }
    return format(value, "yyyy-MM-dd");
  }
  if (typeof value === "number") {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(excelEpoch.getTime() + value * 86400000);
    return toISODate(d);
  }
  const s = String(value).trim();
  if (!s) return null;
  const iso = parseISO(s);
  if (isValid(iso) && /^\d{4}-\d{2}-\d{2}/.test(s)) return format(iso, "yyyy-MM-dd");

  for (const fmt of ["dd/MM/yyyy", "dd.MM.yyyy", "d/M/yyyy", "d.M.yyyy", "dd/MM/yy", "dd.MM.yy"]) {
    const parsed = parse(s, fmt, new Date());
    if (isValid(parsed) && parsed.getFullYear() >= 1990 && parsed.getFullYear() <= 2040) {
      return format(parsed, "yyyy-MM-dd");
    }
  }
  return null;
}

export function formatTRDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = parseISO(iso);
  if (!isValid(d)) return iso;
  return format(d, "dd.MM.yyyy", { locale: tr });
}

export function formatTRMonth(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = parseISO(iso);
  if (!isValid(d)) return iso;
  return format(d, "LLLL yyyy", { locale: tr });
}

export function defaultEndDate(startIso: string | null | undefined): string {
  const start = startIso ? parseISO(startIso) : new Date();
  const base = isValid(start) ? start : new Date();
  return format(addYears(base, 1), "yyyy-MM-dd");
}

export function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function monthKey(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 7);
}

export function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = parseISO(iso);
  if (!isValid(d)) return null;
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((d.getTime() - start.getTime()) / 86400000);
}
