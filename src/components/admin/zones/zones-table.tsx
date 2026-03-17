"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2, Plus, Search, MapPin } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ZoneForm } from "./zone-form";
import { deactivateZone } from "@/actions/zones";
import type { Zone } from "@/types";

interface ZonesTableProps {
  initialZones: Zone[];
}

export function ZonesTable({ initialZones }: ZonesTableProps) {
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [deletingZone, setDeletingZone] = useState<Zone | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = initialZones.filter((z) => {
    const term = search.toLowerCase();
    return (
      z.name.toLowerCase().includes(term) ||
      z.description?.toLowerCase().includes(term)
    );
  });

  function handleEdit(zone: Zone) {
    setEditingZone(zone);
    setFormOpen(true);
  }

  function handleNew() {
    setEditingZone(null);
    setFormOpen(true);
  }

  function handleDeactivate() {
    if (!deletingZone) return;
    startTransition(async () => {
      const result = await deactivateZone(deletingZone.id);
      if (!result.success) {
        alert(result.error);
      }
      setDeletingZone(null);
    });
  }

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
          <Input
            placeholder="Buscar zona..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={handleNew} className="bg-[#1E3A5F] hover:bg-[#2d4f7a]">
          <Plus className="mr-2 h-4 w-4" />
          Nueva Zona
        </Button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Zona</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="w-[100px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-[#64748B]">
                  {search ? "No se encontraron zonas" : (
                    <div className="flex flex-col items-center gap-2 py-4">
                      <MapPin className="h-8 w-8 text-slate-300" />
                      <p>No hay zonas creadas</p>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((zone) => (
                <TableRow key={zone.id}>
                  <TableCell className="font-medium text-[#1E293B]">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-[#3B82F6]" />
                      {zone.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-[#64748B]">
                    {zone.description || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(zone)}
                        className="rounded-md p-1.5 text-[#64748B] hover:bg-slate-100 hover:text-[#3B82F6]"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeletingZone(zone)}
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

      <ZoneForm
        key={editingZone?.id ?? "new"}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        zone={editingZone}
      />

      <Dialog open={!!deletingZone} onOpenChange={(open) => !open && setDeletingZone(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Desactivar Zona</DialogTitle>
            <DialogDescription>
              Se desactivará la zona <strong>{deletingZone?.name}</strong>.
              Los domiciliarios asignados a esta zona quedarán sin zona asignada.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingZone(null)} disabled={isPending}>
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
