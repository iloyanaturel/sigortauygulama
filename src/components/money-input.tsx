"use client";

import * as React from "react";
import { formatTRY, parseTRNumber } from "@/lib/money";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function MoneyInput({
  value,
  onChange,
  className,
  placeholder = "0,00",
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  className?: string;
  placeholder?: string;
}) {
  const formatted = value === null ? "" : formatTRY(value, { withSymbol: false });
  const [draft, setDraft] = React.useState<string | null>(null);
  const text = draft ?? formatted;

  return (
    <Input
      inputMode="decimal"
      placeholder={placeholder}
      className={cn("h-9 text-right font-medium tabular-nums", className)}
      value={text}
      onFocus={() => setDraft(formatted)}
      onChange={(e) => {
        setDraft(e.target.value);
        onChange(parseTRNumber(e.target.value));
      }}
      onBlur={() => {
        const parsed = parseTRNumber(draft ?? formatted);
        onChange(parsed);
        setDraft(null);
      }}
    />
  );
}
