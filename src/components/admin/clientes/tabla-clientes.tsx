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
import { FormularioCliente } from "./formulario-cliente";
import { desactivarCliente } from "@/actions/clientes";
import type { Cliente } from "@/types";

function formatearMoneda(valor: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(valor);
}

interface TablaClientesProps {
  clientesIniciales: Cliente[];
}

export function TablaClientes({ clientesIniciales }: TablaClientesProps) {
  const [busqueda, setBusqueda] = useState("");
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [clienteEditar, setClienteEditar] = useState<Cliente | null>(null);
  const [clienteEliminar, setClienteEliminar] = useState<Cliente | null>(null);
  const [isPending, startTransition] = useTransition();

  const clientesFiltrados = clientesIniciales.filter((c) => {
    const termino = busqueda.toLowerCase();
    return (
      c.nombre.toLowerCase().includes(termino) ||
      c.telefono?.toLowerCase().includes(termino) ||
      c.direccion?.toLowerCase().includes(termino)
    );
  });

  function handleEditar(cliente: Cliente) {
    setClienteEditar(cliente);
    setFormularioAbierto(true);
  }

  function handleNuevo() {
    setClienteEditar(null);
    setFormularioAbierto(true);
  }

  function handleDesactivar() {
    if (!clienteEliminar) return;
    startTransition(async () => {
      const resultado = await desactivarCliente(clienteEliminar.id);
      if (!resultado.success) {
        alert(resultado.error);
      }
      setClienteEliminar(null);
    });
  }

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
          <Input
            placeholder="Buscar por nombre, telefono o direccion..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={handleNuevo} className="bg-[#1E3A5F] hover:bg-[#2d4f7a]">
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Cliente
        </Button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Telefono</TableHead>
              <TableHead>Direccion</TableHead>
              <TableHead className="text-right">Saldo Pendiente</TableHead>
              <TableHead className="w-[100px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clientesFiltrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-[#64748B]">
                  {busqueda ? "No se encontraron clientes" : "No hay clientes registrados"}
                </TableCell>
              </TableRow>
            ) : (
              clientesFiltrados.map((cliente) => (
                <TableRow key={cliente.id}>
                  <TableCell className="font-medium text-[#1E293B]">
                    {cliente.nombre}
                  </TableCell>
                  <TableCell className="text-[#64748B]">
                    {cliente.telefono || "—"}
                  </TableCell>
                  <TableCell className="text-[#64748B] max-w-[200px] truncate">
                    {cliente.direccion || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {cliente.saldo_pendiente > 0 ? (
                      <Badge variant="destructive" className="bg-[#EF4444]">
                        {formatearMoneda(cliente.saldo_pendiente)}
                      </Badge>
                    ) : (
                      <span className="text-[#10B981] font-medium">
                        {formatearMoneda(0)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEditar(cliente)}
                        className="rounded-md p-1.5 text-[#64748B] hover:bg-slate-100 hover:text-[#3B82F6]"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setClienteEliminar(cliente)}
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

      <FormularioCliente
        abierto={formularioAbierto}
        onCerrar={() => setFormularioAbierto(false)}
        cliente={clienteEditar}
      />

      <Dialog open={!!clienteEliminar} onOpenChange={(open) => !open && setClienteEliminar(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Desactivar Cliente</DialogTitle>
            <DialogDescription>
              Se desactivara el cliente <strong>{clienteEliminar?.nombre}</strong>.
              Esta accion no elimina los datos, solo oculta al cliente del sistema.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClienteEliminar(null)} disabled={isPending}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDesactivar} disabled={isPending}>
              {isPending ? "Desactivando..." : "Desactivar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
