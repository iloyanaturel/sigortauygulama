const FOLD_MAP: Record<string, string> = {
  İ: "I",
  I: "I",
  ı: "I",
  i: "I",
  Ş: "S",
  ş: "S",
  Ğ: "G",
  ğ: "G",
  Ü: "U",
  ü: "U",
  Ö: "O",
  ö: "O",
  Ç: "C",
  ç: "C",
  Â: "A",
  â: "A",
  Î: "I",
  î: "I",
  Û: "U",
  û: "U",
};

export function foldTurkish(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .split("")
    .map((ch) => FOLD_MAP[ch] ?? ch)
    .join("")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function titleName(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map((part) => {
      if (!part) return part;
      const lower = part.toLocaleLowerCase("tr-TR");
      return lower.charAt(0).toLocaleUpperCase("tr-TR") + lower.slice(1);
    })
    .join(" ");
}

export function compactSpaces(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function plateKey(value: string | null | undefined): string {
  const compact = foldTurkish(value).replace(/[^A-Z0-9]/g, "");
  return compact.replace(/^0+(?=\d)/, "");
}

export function formatPlate(value: string | null | undefined): string {
  const folded = foldTurkish(value).replace(/[^A-Z0-9]/g, "");
  const match = folded.match(/^0?(\d{2})([A-Z]{1,3})(\d{2,4})$/);
  if (!match) return compactSpaces(value ?? "").toLocaleUpperCase("tr-TR");
  return `${match[1]} ${match[2]} ${match[3]}`;
}

export function extractTurkishPlate(text: string): string {
  const folded = foldTurkish(text).replace(/[^A-Z0-9\s]/g, " ");
  const match = folded.match(/\b(\d{2,3})\s*([A-Z]{1,3})\s*(\d{2,4})\b/);
  if (!match) return "";
  return formatPlate(`${match[1]}${match[2]}${match[3]}`);
}
