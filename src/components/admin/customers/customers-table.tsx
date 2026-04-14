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
}

export function CustomersTable({ initialCustomers, couriers = [] }: CustomersTableProps) {
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
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

      <div className="rounded-lg border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Telefono</TableHead>
              <TableHead>Domiciliario</TableHead>
              <TableHead className="text-right">Saldo Pendiente</TableHead>
              <TableHead className="w-[100px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-[#64748B]">
                  {search ? "No se encontraron clientes" : "No hay clientes registrados"}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="text-[#64748B] font-mono text-xs">
                    {customer.reference_code || "—"}
                  </TableCell>
                  <TableCell className="font-medium text-[#1E293B]">
                    {customer.name}
                  </TableCell>
                  <TableCell className="text-[#64748B]">
                    {customer.phone || "—"}
                  </TableCell>
                  <TableCell className="text-[#64748B] text-sm">
                    {customer.preferred_courier
                      ? customer.preferred_courier.name
                      : couriers.find((c) => c.id === customer.preferred_courier_id)?.name || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {customer.pending_balance > 0 ? (
                      <Badge variant="destructive" className="bg-[#EF4444]">
                        {formatCurrency(customer.pending_balance)}
                      </Badge>
                    ) : (
                      <span className="text-[#10B981] font-medium">
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
