"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3Icon,
  BanIcon,
  CalculatorIcon,
  FilePlus2Icon,
  FilesIcon,
  LayoutDashboardIcon,
  SettingsIcon,
  ShieldCheckIcon,
  TimerResetIcon,
  UsersIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Özet", icon: LayoutDashboardIcon },
  { href: "/policeler/yeni", label: "Yeni poliçe", icon: FilePlus2Icon },
  { href: "/policeler/iptal", label: "İptal", icon: BanIcon },
  { href: "/policeler", label: "Poliçeler", icon: FilesIcon },
  { href: "/musteriler", label: "Müşteriler", icon: UsersIcon },
  { href: "/yenilemeler", label: "Yenilemeler", icon: TimerResetIcon },
  { href: "/raporlar", label: "Raporlar", icon: BarChart3Icon },
  { href: "/hesap", label: "Hesap", icon: CalculatorIcon },
  { href: "/ayarlar", label: "Ayarlar", icon: SettingsIcon },
];

const MOBILE_NAV = [
  NAV[0],
  NAV[1],
  NAV[3],
  NAV[6],
  NAV[8],
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-full">
      <aside className="hidden w-60 shrink-0 border-r bg-sidebar md:flex md:flex-col">
        <div className="flex items-center gap-2 border-b px-4 py-4">
          <div className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-lg">
            <ShieldCheckIcon className="size-5" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-wide">Bolaman Sigorta</p>
            <p className="text-muted-foreground text-xs">Poliçe takip</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : item.href === "/policeler"
                  ? pathname === "/policeler" || /^\/policeler\/(?!yeni$|iptal$)[^/]+$/.test(pathname)
                  : pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/70",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b px-3 py-2 md:hidden">
          <ShieldCheckIcon className="size-5" />
          <span className="text-sm font-semibold">Bolaman Sigorta</span>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
        <nav className="bg-background/95 sticky bottom-0 grid grid-cols-5 border-t md:hidden">
          {MOBILE_NAV.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/"
                ? pathname === "/"
                : item.href === "/policeler"
                  ? pathname === "/policeler" || /^\/policeler\/(?!yeni$|iptal$)[^/]+$/.test(pathname)
                  : pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 px-1 py-2 text-[11px]",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
