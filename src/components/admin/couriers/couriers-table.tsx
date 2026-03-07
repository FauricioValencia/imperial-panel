"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus, Search, UserCheck, UserX } from "lucide-react";
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
import { CourierForm } from "./courier-form";
import { toggleCourierActive } from "@/actions/couriers";
import type { User } from "@/types";

interface CouriersTableProps {
  initialCouriers: User[];
}

export function CouriersTable({ initialCouriers }: CouriersTableProps) {
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingCourier, setEditingCourier] = useState<User | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = initialCouriers.filter((c) => {
    const term = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      c.email.toLowerCase().includes(term)
    );
  });

  function handleEdit(courier: User) {
    setEditingCourier(courier);
    setFormOpen(true);
  }

  function handleNew() {
    setEditingCourier(null);
    setFormOpen(true);
  }

  function handleToggleActive(courier: User) {
    startTransition(async () => {
      const result = await toggleCourierActive(courier.id);
      if (!result.success) {
        alert(result.error);
      }
    });
  }

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
          <Input
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={handleNew} className="bg-[#1E3A5F] hover:bg-[#2d4f7a]">
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Domiciliario
        </Button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-center">Estado</TableHead>
              <TableHead className="w-[100px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-[#64748B]">
                  {search ? "No se encontraron domiciliarios" : "No hay domiciliarios registrados"}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((courier) => (
                <TableRow key={courier.id} className={!courier.active ? "opacity-50" : ""}>
                  <TableCell className="font-medium text-[#1E293B]">
                    {courier.name}
                  </TableCell>
                  <TableCell className="text-[#64748B]">
                    {courier.email}
                  </TableCell>
                  <TableCell className="text-center">
                    {courier.active ? (
                      <Badge className="bg-[#10B981] text-white hover:bg-[#10B981]">
                        Activo
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-slate-100 text-slate-500">
                        Inactivo
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(courier)}
                        className="rounded-md p-1.5 text-[#64748B] hover:bg-slate-100 hover:text-[#3B82F6]"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(courier)}
                        disabled={isPending}
                        className={`rounded-md p-1.5 text-[#64748B] hover:bg-slate-100 ${
                          courier.active ? "hover:text-[#EF4444]" : "hover:text-[#10B981]"
                        }`}
                        title={courier.active ? "Desactivar" : "Activar"}
                      >
                        {courier.active ? (
                          <UserX className="h-4 w-4" />
                        ) : (
                          <UserCheck className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CourierForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        courier={editingCourier}
      />
    </>
  );
}
