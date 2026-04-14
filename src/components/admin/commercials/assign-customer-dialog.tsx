"use client";

import { useState, useTransition } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { assignCustomerToCommercial } from "@/actions/commercials";
import type { Customer } from "@/types";

interface AssignCustomerDialogProps {
  commercialId: string;
  availableCustomers: Customer[];
}

export function AssignCustomerDialog({
  commercialId,
  availableCustomers,
}: AssignCustomerDialogProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const filtered = availableCustomers.filter((c) => {
    const term = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      c.phone?.toLowerCase().includes(term) ||
      c.reference_code?.toLowerCase().includes(term)
    );
  });

  function handleAssign(customerId: string) {
    setError(null);
    startTransition(async () => {
      const result = await assignCustomerToCommercial(customerId, commercialId);
      if (!result.success) {
        setError(result.error ?? "Error asignando cliente");
        return;
      }
      setOpen(false);
      setSearch("");
    });
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="bg-[#1E3A5F] hover:bg-[#2d4f7a]"
      >
        <Plus className="mr-2 h-4 w-4" />
        Asignar cliente
      </Button>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) {
            setSearch("");
            setError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#1E293B]">Asignar cliente</DialogTitle>
            <DialogDescription>
              Selecciona un cliente sin comercial asignado para vincularlo.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
            <Input
              placeholder="Buscar cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              disabled={isPending}
            />
          </div>

          <div className="max-h-80 overflow-y-auto rounded-lg border border-slate-200">
            {filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-[#64748B]">
                {availableCustomers.length === 0
                  ? "No hay clientes disponibles para asignar"
                  : "No se encontraron clientes"}
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {filtered.map((customer) => (
                  <li
                    key={customer.id}
                    className="flex items-center justify-between gap-3 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[#1E293B]">
                        {customer.name}
                      </p>
                      <p className="truncate text-xs text-[#64748B]">
                        {customer.phone || "Sin telefono"}
                        {customer.reference_code ? ` · ${customer.reference_code}` : ""}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isPending}
                      onClick={() => handleAssign(customer.id)}
                    >
                      Asignar
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
