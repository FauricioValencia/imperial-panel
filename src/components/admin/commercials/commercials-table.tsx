"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Eye, Pencil, Plus, Search, UserCheck, UserX } from "lucide-react";
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
import { CommercialForm } from "./commercial-form";
import { toggleCommercialActive } from "@/actions/commercials";
import type { User } from "@/types";

interface CommercialsTableProps {
  initialCommercials: User[];
}

export function CommercialsTable({ initialCommercials }: CommercialsTableProps) {
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingCommercial, setEditingCommercial] = useState<User | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = initialCommercials.filter((c) => {
    const term = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      c.email.toLowerCase().includes(term)
    );
  });

  function handleEdit(commercial: User) {
    setEditingCommercial(commercial);
    setFormOpen(true);
  }

  function handleNew() {
    setEditingCommercial(null);
    setFormOpen(true);
  }

  function handleToggleActive(commercial: User) {
    startTransition(async () => {
      const result = await toggleCommercialActive(commercial.id);
      if (!result.success) {
        alert(result.error);
      }
    });
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm sm:flex-1">
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
          Nuevo Comercial
        </Button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead className="hidden md:table-cell">Email</TableHead>
              <TableHead className="text-center">Estado</TableHead>
              <TableHead className="w-[100px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-[#64748B]">
                  {search ? "No se encontraron comerciales" : "No hay comerciales registrados"}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((commercial) => (
                <TableRow key={commercial.id} className={!commercial.active ? "opacity-50" : ""}>
                  <TableCell className="font-medium text-[#1E293B]">
                    <Link href={`/commercials/${commercial.id}`} className="hover:text-[#3B82F6] hover:underline">
                      {commercial.name}
                    </Link>
                    <p className="text-xs font-normal text-[#64748B] md:hidden">
                      {commercial.email}
                    </p>
                  </TableCell>
                  <TableCell className="hidden text-[#64748B] md:table-cell">
                    {commercial.email}
                  </TableCell>
                  <TableCell className="text-center">
                    {commercial.active ? (
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
                      <Link
                        href={`/commercials/${commercial.id}`}
                        className="rounded-md p-1.5 text-[#64748B] hover:bg-slate-100 hover:text-[#1E3A5F]"
                        title="Ver detalle"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleEdit(commercial)}
                        className="rounded-md p-1.5 text-[#64748B] hover:bg-slate-100 hover:text-[#3B82F6]"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(commercial)}
                        disabled={isPending}
                        className={`rounded-md p-1.5 text-[#64748B] hover:bg-slate-100 ${
                          commercial.active ? "hover:text-[#EF4444]" : "hover:text-[#10B981]"
                        }`}
                        title={commercial.active ? "Desactivar" : "Activar"}
                      >
                        {commercial.active ? (
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

      <CommercialForm
        key={editingCommercial?.id ?? "new"}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        commercial={editingCommercial}
      />
    </>
  );
}
