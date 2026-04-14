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
import type { Customer } from "@/types";

interface CustomerComboboxProps {
  customers: Customer[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
  placeholder?: string;
}

export function CustomerCombobox({
  customers,
  value,
  onChange,
  disabled,
  id,
  placeholder = "Seleccionar cliente...",
}: CustomerComboboxProps) {
  const [open, setOpen] = useState(false);

  const selected = useMemo(
    () => customers.find((c) => c.id === value) ?? null,
    [customers, value]
  );

  const label = selected
    ? selected.name +
      (selected.reference_code ? ` (${selected.reference_code})` : "")
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
          aria-label="Seleccionar cliente"
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
          <CommandInput placeholder="Buscar por nombre o código..." />
          <CommandList>
            <CommandEmpty>No se encontraron clientes.</CommandEmpty>
            <CommandGroup>
              {customers.map((c) => {
                const searchValue = `${c.name} ${c.reference_code ?? ""}`.trim();
                return (
                  <CommandItem
                    key={c.id}
                    value={searchValue}
                    onSelect={() => {
                      onChange(c.id);
                      setOpen(false);
                    }}
                    className="min-h-11"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === c.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="text-[#1E293B]">{c.name ?? "Cliente eliminado"}</span>
                      {c.reference_code && (
                        <span className="text-xs text-[#64748B]">
                          {c.reference_code}
                        </span>
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
