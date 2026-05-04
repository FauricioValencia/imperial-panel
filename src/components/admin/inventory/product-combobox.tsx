"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";

interface ProductComboboxProps {
  products: Product[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
  placeholder?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
}

export function ProductCombobox({
  products,
  value,
  onChange,
  disabled,
  id,
  placeholder = "Seleccionar producto...",
  allowEmpty = false,
  emptyLabel = "Todos los productos",
}: ProductComboboxProps) {
  const [open, setOpen] = useState(false);

  const selected = useMemo(
    () => products.find((p) => p.id === value) ?? null,
    [products, value]
  );

  const label = selected
    ? selected.name + (selected.codigo ? ` (${selected.codigo})` : "")
    : value === "" && allowEmpty
      ? emptyLabel
      : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Seleccionar producto"
          disabled={disabled}
          className={cn(
            "w-full justify-between min-h-11 font-normal",
            !selected && "text-[#64748B]"
          )}
        >
          <span className="truncate text-left">{label}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command
          filter={(itemValue, search) => {
            const normalized = itemValue.toLowerCase();
            return normalized.includes(search.toLowerCase()) ? 1 : 0;
          }}
        >
          <CommandInput placeholder="Buscar por nombre o codigo..." />
          <CommandList>
            <CommandEmpty>No se encontraron productos.</CommandEmpty>
            <CommandGroup>
              {allowEmpty && (
                <CommandItem
                  value="__all__"
                  onSelect={() => {
                    onChange("");
                    setOpen(false);
                  }}
                  className="min-h-11"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === "" ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="text-[#1E293B]">{emptyLabel}</span>
                </CommandItem>
              )}
              {products.map((p) => {
                const searchValue = `${p.name} ${p.codigo ?? ""}`.trim();
                return (
                  <CommandItem
                    key={p.id}
                    value={searchValue}
                    onSelect={() => {
                      onChange(p.id);
                      setOpen(false);
                    }}
                    className="min-h-11"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === p.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="text-[#1E293B]">{p.name}</span>
                      {p.codigo && (
                        <span className="text-xs text-[#64748B]">{p.codigo}</span>
                      )}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
