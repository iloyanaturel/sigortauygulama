"use client";

import * as React from "react";
import { CheckIcon, ChevronsUpDownIcon, PlusIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { foldTurkish } from "@/lib/text";

type Option = { value: string; label: string; hint?: string };

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder = "Ara...",
  emptyText = "Kayıt yok",
  allowCreate = true,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder: string;
  searchPlaceholder?: string;
  emptyText?: string;
  allowCreate?: boolean;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = foldTurkish(query);
    if (!q) return options;
    return options.filter(
      (opt) => foldTurkish(opt.label).includes(q) || foldTurkish(opt.hint ?? "").includes(q),
    );
  }, [options, query]);

  const canCreate =
    allowCreate &&
    query.trim().length > 0 &&
    !options.some((opt) => foldTurkish(opt.label) === foldTurkish(query.trim()));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          buttonVariants({ variant: "outline" }),
          "h-9 w-full justify-between font-normal",
          className,
        )}
      >
        <span className={cn("truncate", !value && "text-muted-foreground")}>
          {value || placeholder}
        </span>
        <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>{canCreate ? " " : emptyText}</CommandEmpty>
            {value ? (
              <CommandGroup>
                <CommandItem
                  value="__clear"
                  onSelect={() => {
                    onChange("");
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  Seçimi temizle
                </CommandItem>
              </CommandGroup>
            ) : null}
            {canCreate ? (
              <CommandGroup>
                <CommandItem
                  value={`create-${query}`}
                  onSelect={() => {
                    onChange(query.trim());
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  <PlusIcon />
                  Yeni ekle: {query.trim()}
                </CommandItem>
              </CommandGroup>
            ) : null}
            <CommandGroup>
              {filtered.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.value}
                  data-checked={value === opt.label}
                  onSelect={() => {
                    onChange(opt.label);
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  <CheckIcon className={cn(value === opt.label ? "opacity-100" : "opacity-0")} />
                  <span className="flex min-w-0 flex-col">
                    <span>{opt.label}</span>
                    {opt.hint ? (
                      <span className="text-muted-foreground text-xs">{opt.hint}</span>
                    ) : null}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
