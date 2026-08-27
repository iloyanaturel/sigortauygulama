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
