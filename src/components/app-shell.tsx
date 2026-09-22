"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import {
  BarChart3Icon,
  BanIcon,
  BookMarkedIcon,
  CalculatorIcon,
  FilePlus2Icon,
  FilesIcon,
  LayoutDashboardIcon,
  MoreHorizontalIcon,
  SettingsIcon,
  ShieldCheckIcon,
  TimerResetIcon,
  UsersIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const NAV = [
  { href: "/", label: "Özet", icon: LayoutDashboardIcon, group: "İş" },
  { href: "/policeler/yeni", label: "Yeni poliçe", icon: FilePlus2Icon, group: "İş" },
  { href: "/policeler/iptal", label: "İptal", icon: BanIcon, group: "İş" },
  { href: "/policeler", label: "Poliçeler", icon: FilesIcon, group: "Kayıt" },
  { href: "/musteriler", label: "Müşteriler", icon: UsersIcon, group: "Kayıt" },
  { href: "/yenilemeler", label: "Yenilemeler", icon: TimerResetIcon, group: "Kayıt" },
  { href: "/raporlar", label: "Raporlar", icon: BarChart3Icon, group: "Rapor" },
  { href: "/hesap", label: "Hesap", icon: CalculatorIcon, group: "Rapor" },
  { href: "/katalog", label: "Katalog", icon: BookMarkedIcon, group: "Yönetim" },
  { href: "/ayarlar", label: "Ayarlar", icon: SettingsIcon, group: "Yönetim" },
];

const MOBILE_NAV = [NAV[0], NAV[1], NAV[3], NAV[4], NAV[8]];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/policeler") return pathname === "/policeler" || /^\/policeler\/(?!yeni$|iptal$)[^/]+$/.test(pathname);
  if (href === "/musteriler") return pathname === "/musteriler" || pathname.startsWith("/musteriler/");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  return (
    <div className="flex min-h-full bg-background">
      <aside className="hidden w-60 shrink-0 border-r bg-sidebar md:flex md:flex-col">
        <div className="flex items-center gap-2 border-b px-4 py-4">
          <div className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-lg">
            <ShieldCheckIcon className="size-5" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-wide">Bolaman Sigorta</p>
            <p className="text-muted-foreground text-xs">Poliçe ve müşteri takip</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-4 overflow-y-auto p-3">
          {["İş", "Kayıt", "Rapor", "Yönetim"].map((group) => (
            <div key={group} className="space-y-1">
              <p className="text-muted-foreground px-3 text-[11px] font-semibold tracking-wider uppercase">{group}</p>
              {NAV.filter((item) => item.group === group).map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch
                    onClick={() => startTransition(() => undefined)}
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
            </div>
          ))}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-2 border-b bg-background px-3 py-2 md:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheckIcon className="size-5 text-primary" />
            <span className="text-sm font-semibold">Bolaman Sigorta</span>
          </div>
          <Sheet>
            <SheetTrigger className="text-muted-foreground inline-flex size-9 items-center justify-center rounded-md border">
              <MoreHorizontalIcon className="size-4" />
              <span className="sr-only">Menü</span>
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <SheetHeader>
                <SheetTitle>Menü</SheetTitle>
              </SheetHeader>
              <nav className="mt-4 grid gap-1">
                {NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch
                    className={cn(
                      "rounded-lg px-3 py-2 text-sm",
                      isActive(pathname, item.href) ? "bg-muted font-medium" : "hover:bg-muted/70",
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
        <nav className="bg-background/95 sticky bottom-0 grid grid-cols-5 border-t md:hidden">
          {MOBILE_NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                className={cn(
                  "flex flex-col items-center gap-1 px-1 py-2 text-[11px]",
                  active ? "text-primary font-medium" : "text-muted-foreground",
                )}
              >
                <Icon className="size-4" />
                {item.label.split(" ")[0]}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
