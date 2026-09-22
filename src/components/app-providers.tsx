"use client";

import { AppDataProvider } from "@/hooks/use-app-data";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AppShell } from "@/components/app-shell";
import type { ReactNode } from "react";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AppDataProvider>
      <TooltipProvider>
        <AppShell>{children}</AppShell>
        <Toaster />
      </TooltipProvider>
    </AppDataProvider>
  );
}
