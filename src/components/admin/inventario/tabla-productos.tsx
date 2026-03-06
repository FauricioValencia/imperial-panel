"use client";

import { useState, useTransition } from "react";
import {
  Pencil,
  Trash2,
  Plus,
  Search,
  PackagePlus,
  History,
  AlertTriangle,
} from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FormularioProducto } from "./formulario-producto";
import { DialogoEntrada } from "./dialogo-entrada";
import { HistorialMovimientos } from "./historial-movimientos";
import { desactivarProducto } from "@/actions/inventario";
import type { Producto } from "@/types";

function formatearMoneda(valor: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(valor);
}

interface TablaProductosProps {
  productosIniciales: Producto[];
}

export function TablaProductos({ productosIniciales }: TablaProductosProps) {
  const [busqueda, setBusqueda] = useState("");
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [productoEditar, setProductoEditar] = useState<Producto | null>(null);
  const [productoEliminar, setProductoEliminar] = useState<Producto | null>(null);
  const [productoEntrada, setProductoEntrada] = useState<Producto | null>(null);
  const [historial, setHistorial] = useState<{ id: string; nombre: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const productosFiltrados = productosIniciales.filter((p) => {
    const termino = busqueda.toLowerCase();
    return (
      p.nombre.toLowerCase().includes(termino) ||
      p.descripcion?.toLowerCase().includes(termino)
    );
  });

  const productosStockBajo = productosIniciales.filter(
    (p) => p.stock <= p.stock_minimo
  ).length;

  function handleEditar(producto: Producto) {
    setProductoEditar(producto);
    setFormularioAbierto(true);
  }

  function handleNuevo() {
    setProductoEditar(null);
    setFormularioAbierto(true);
  }

  function handleDesactivar() {
    if (!productoEliminar) return;
    startTransition(async () => {
      const resultado = await desactivarProducto(productoEliminar.id);
      if (!resultado.success) {
        alert(resultado.error);
      }
      setProductoEliminar(null);
    });
  }

  return (
    <>
      {productosStockBajo > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <AlertTriangle className="h-4 w-4 text-[#F59E0B]" />
          <p className="text-sm text-amber-800">
            <strong>{productosStockBajo}</strong> producto{productosStockBajo > 1 ? "s" : ""} con stock bajo o agotado
          </p>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
          <Input
            placeholder="Buscar por nombre o descripcion..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={handleNuevo} className="bg-[#1E3A5F] hover:bg-[#2d4f7a]">
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Producto
        </Button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Descripcion</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead className="text-center">Stock</TableHead>
              <TableHead className="w-[140px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productosFiltrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-[#64748B]">
                  {busqueda ? "No se encontraron productos" : "No hay productos registrados"}
                </TableCell>
              </TableRow>
            ) : (
              productosFiltrados.map((producto) => {
                const stockBajo = producto.stock <= producto.stock_minimo;
                const agotado = producto.stock === 0;

                return (
                  <TableRow key={producto.id}>
                    <TableCell className="font-medium text-[#1E293B]">
                      {producto.nombre}
                    </TableCell>
                    <TableCell className="text-[#64748B] max-w-[200px] truncate">
                      {producto.descripcion || "—"}
                    </TableCell>
                    <TableCell className="text-right text-[#1E293B]">
                      {formatearMoneda(producto.precio)}
                    </TableCell>
                    <TableCell className="text-center">
                      {agotado ? (
                        <Badge variant="destructive" className="bg-[#EF4444]">
                          Agotado
                        </Badge>
                      ) : stockBajo ? (
                        <Badge className="bg-[#F59E0B] text-white hover:bg-[#F59E0B]">
                          {producto.stock} (min: {producto.stock_minimo})
                        </Badge>
                      ) : (
                        <span className="text-[#10B981] font-medium">{producto.stock}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <TooltipProvider delayDuration={300}>
                        <div className="flex gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => setProductoEntrada(producto)}
                                className="rounded-md p-1.5 text-[#64748B] hover:bg-slate-100 hover:text-[#10B981]"
                              >
                                <PackagePlus className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>Registrar entrada</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => setHistorial({ id: producto.id, nombre: producto.nombre })}
                                className="rounded-md p-1.5 text-[#64748B] hover:bg-slate-100 hover:text-[#3B82F6]"
                              >
                                <History className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>Ver movimientos</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => handleEditar(producto)}
                                className="rounded-md p-1.5 text-[#64748B] hover:bg-slate-100 hover:text-[#3B82F6]"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>Editar</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => setProductoEliminar(producto)}
                                className="rounded-md p-1.5 text-[#64748B] hover:bg-slate-100 hover:text-[#EF4444]"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>Desactivar</TooltipContent>
                          </Tooltip>
                        </div>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <FormularioProducto
        abierto={formularioAbierto}
        onCerrar={() => setFormularioAbierto(false)}
        producto={productoEditar}
      />

      <DialogoEntrada
        abierto={!!productoEntrada}
        onCerrar={() => setProductoEntrada(null)}
        producto={productoEntrada}
      />

      <HistorialMovimientos
        abierto={!!historial}
        onCerrar={() => setHistorial(null)}
        productoId={historial?.id ?? null}
        productoNombre={historial?.nombre ?? ""}
      />

      <Dialog open={!!productoEliminar} onOpenChange={(open) => !open && setProductoEliminar(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Desactivar Producto</DialogTitle>
            <DialogDescription>
              Se desactivara el producto <strong>{productoEliminar?.nombre}</strong>.
              No aparecera en listados ni podra incluirse en nuevos pedidos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProductoEliminar(null)} disabled={isPending}>
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
