"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CustomerForm } from "./customer-form";
import { deactivateCustomer } from "@/actions/customers";
import { formatCurrency } from "@/lib/format";
import type { Customer, User } from "@/types";

interface CustomersTableProps {
  initialCustomers: Customer[];
  couriers?: User[];
  commercials?: User[];
}

export function CustomersTable({
  initialCustomers,
  couriers = [],
  commercials = [],
}: CustomersTableProps) {
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = initialCustomers.filter((c) => {
    const term = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      c.phone?.toLowerCase().includes(term) ||
      c.address?.toLowerCase().includes(term)
    );
  });

  function getCourierName(c: Customer) {
    return (
      c.preferred_courier?.name ||
      couriers.find((u) => u.id === c.preferred_courier_id)?.name ||
      "—"
    );
  }

  function getCommercialName(c: Customer) {
    return (
      c.commercial?.name ||
      commercials.find((u) => u.id === c.commercial_id)?.name ||
      "—"
    );
  }

  function handleEdit(customer: Customer) {
    setEditingCustomer(customer);
    setFormOpen(true);
  }

  function handleNew() {
    setEditingCustomer(null);
    setFormOpen(true);
  }

  function handleDeactivate() {
    if (!deletingCustomer) return;
    startTransition(async () => {
      const result = await deactivateCustomer(deletingCustomer.id);
      if (!result.success) {
        alert(result.error);
      }
      setDeletingCustomer(null);
    });
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm sm:flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
          <Input
            placeholder="Buscar por nombre, telefono o direccion..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={handleNew} className="bg-[#1E3A5F] hover:bg-[#2d4f7a]">
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Cliente
        </Button>
      </div>

      {/* Mobile cards (<md) */}
      <div className="space-y-3 md:hidden">
        {filtered.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-[#64748B]">
            {search ? "No se encontraron clientes" : "No hay clientes registrados"}
          </div>
        ) : (
          filtered.map((customer) => (
            <div
              key={customer.id}
              className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-[#1E293B]">
                    {customer.name}
                  </p>
                  {customer.reference_code && (
                    <p className="font-mono text-xs text-[#64748B]">
                      {customer.reference_code}
                    </p>
                  )}
                </div>
                {customer.pending_balance > 0 ? (
                  <Badge variant="destructive" className="bg-[#EF4444] shrink-0">
                    {formatCurrency(customer.pending_balance)}
                  </Badge>
                ) : (
                  <span className="shrink-0 text-sm font-medium text-[#10B981]">
                    Al dia
                  </span>
                )}
              </div>

              <dl className="mt-2 space-y-1 text-xs text-[#64748B]">
                {customer.phone && (
                  <div className="flex gap-2">
                    <dt className="shrink-0">Telefono:</dt>
                    <dd className="text-[#1E293B]">{customer.phone}</dd>
                  </div>
                )}
                <div className="flex gap-2">
                  <dt className="shrink-0">Domiciliario:</dt>
                  <dd className="truncate text-[#1E293B]">{getCourierName(customer)}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="shrink-0">Comercial:</dt>
                  <dd className="truncate text-[#1E293B]">{getCommercialName(customer)}</dd>
                </div>
              </dl>

              <div className="mt-3 flex justify-end gap-1 border-t border-slate-100 pt-2">
                <button
                  onClick={() => handleEdit(customer)}
                  className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-[#3B82F6] hover:bg-blue-50"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </button>
                <button
                  onClick={() => setDeletingCustomer(customer)}
                  className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-[#EF4444] hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Desactivar
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop table (md+) */}
      <div className="hidden rounded-lg border border-slate-200 bg-white md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="hidden lg:table-cell">Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Telefono</TableHead>
              <TableHead className="hidden lg:table-cell">Domiciliario</TableHead>
              <TableHead className="hidden xl:table-cell">Comercial</TableHead>
              <TableHead className="text-right">Saldo Pendiente</TableHead>
              <TableHead className="w-[100px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-[#64748B]">
                  {search ? "No se encontraron clientes" : "No hay clientes registrados"}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="hidden font-mono text-xs text-[#64748B] lg:table-cell">
                    {customer.reference_code || "—"}
                  </TableCell>
                  <TableCell className="font-medium text-[#1E293B]">
                    {customer.name}
                  </TableCell>
                  <TableCell className="text-[#64748B]">
                    {customer.phone || "—"}
                  </TableCell>
                  <TableCell className="hidden text-sm text-[#64748B] lg:table-cell">
                    {getCourierName(customer)}
                  </TableCell>
                  <TableCell className="hidden text-sm text-[#64748B] xl:table-cell">
                    {getCommercialName(customer)}
                  </TableCell>
                  <TableCell className="text-right">
                    {customer.pending_balance > 0 ? (
                      <Badge variant="destructive" className="bg-[#EF4444]">
                        {formatCurrency(customer.pending_balance)}
                      </Badge>
                    ) : (
                      <span className="font-medium text-[#10B981]">
                        {formatCurrency(0)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(customer)}
                        className="rounded-md p-1.5 text-[#64748B] hover:bg-slate-100 hover:text-[#3B82F6]"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeletingCustomer(customer)}
                        className="rounded-md p-1.5 text-[#64748B] hover:bg-slate-100 hover:text-[#EF4444]"
                        title="Desactivar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CustomerForm
        key={editingCustomer?.id ?? "new"}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        customer={editingCustomer}
        couriers={couriers}
        commercials={commercials}
      />

      <Dialog open={!!deletingCustomer} onOpenChange={(open) => !open && setDeletingCustomer(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Desactivar Cliente</DialogTitle>
            <DialogDescription>
              Se desactivara el cliente <strong>{deletingCustomer?.name}</strong>.
              Esta accion no elimina los datos, solo oculta al cliente del sistema.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingCustomer(null)} disabled={isPending}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeactivate} disabled={isPending}>
              {isPending ? "Desactivando..." : "Desactivar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
