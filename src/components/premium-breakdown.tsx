"use client";

import { formatPercent, formatTRY } from "@/lib/money";
import type { PremiumBreakdown } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PremiumBreakdownCard({
  breakdown,
  className,
}: {
  breakdown: PremiumBreakdown;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-xl border bg-card", className)}>
      <div className="border-b px-4 py-3">
        <p className="text-sm font-medium">Prim dökümü</p>
        <p className="text-muted-foreground text-xs">
          Branşa göre vergi, fon ve kesintiler otomatik hesaplanır.
        </p>
      </div>
      <div className="divide-y">
        {breakdown.lines.map((line) => {
          const isTotal = line.code === "brut";
          return (
            <div
              key={line.code}
              className={cn(
                "flex items-center justify-between gap-3 px-4 py-2.5 text-sm",
                isTotal && "bg-primary/10 font-semibold",
              )}
            >
              <span>
                {line.label}
                {line.rate !== null ? (
                  <span className="text-muted-foreground ml-2 text-xs">
                    {formatPercent(line.rate)}
                  </span>
                ) : null}
              </span>
              <span className="tabular-nums">{formatTRY(line.amount)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
