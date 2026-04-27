"use client";

import { useState, useTransition } from "react";
import {
  Pencil,
  Trash2,
  Plus,
  Search,
  PackagePlus,
  PackageMinus,
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
import { ProductForm } from "./product-form";
import { StockEntryDialog } from "./stock-entry-dialog";
import { OutboundDialog } from "./outbound-dialog";
import { MovementHistory } from "./movement-history";
import { deactivateProduct } from "@/actions/inventory";
import { formatCurrency } from "@/lib/format";
import type { Customer, Product } from "@/types";

interface ProductsTableProps {
  initialProducts: Product[];
  customers?: Customer[];
}

function StockBadge({ product }: { product: Product }) {
  const lowStock = product.stock <= product.min_stock;
  const outOfStock = product.stock === 0;

  if (outOfStock) {
    return (
      <Badge variant="destructive" className="bg-[#EF4444]">
        Agotado
      </Badge>
    );
  }
  if (lowStock) {
    return (
      <Badge className="bg-[#F59E0B] text-white hover:bg-[#F59E0B]">
        {product.stock} (min: {product.min_stock})
      </Badge>
    );
  }
  return <span className="font-medium text-[#10B981]">{product.stock}</span>;
}

export function ProductsTable({ initialProducts, customers = [] }: ProductsTableProps) {
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [entryProduct, setEntryProduct] = useState<Product | null>(null);
  const [outboundProduct, setOutboundProduct] = useState<Product | null>(null);
  const [history, setHistory] = useState<{ id: string; name: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = initialProducts.filter((p) => {
    const term = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      p.description?.toLowerCase().includes(term)
    );
  });

  const lowStockCount = initialProducts.filter(
    (p) => p.stock <= p.min_stock
  ).length;

  function handleEdit(product: Product) {
    setEditingProduct(product);
    setFormOpen(true);
  }

  function handleNew() {
    setEditingProduct(null);
    setFormOpen(true);
  }

  function handleDeactivate() {
    if (!deletingProduct) return;
    startTransition(async () => {
      const result = await deactivateProduct(deletingProduct.id);
      if (!result.success) {
        alert(result.error);
      }
      setDeletingProduct(null);
    });
  }

  return (
    <>
      {lowStockCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-[#F59E0B]" />
          <p className="text-sm text-amber-800">
            <strong>{lowStockCount}</strong> producto{lowStockCount > 1 ? "s" : ""} con stock bajo o agotado
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm sm:flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
          <Input
            placeholder="Buscar por nombre o descripcion..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={handleNew} className="bg-[#1E3A5F] hover:bg-[#2d4f7a]">
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Producto
        </Button>
      </div>

      {/* Mobile cards (<md) */}
      <div className="space-y-3 md:hidden">
        {filtered.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-[#64748B]">
            {search ? "No se encontraron productos" : "No hay productos registrados"}
          </div>
        ) : (
          filtered.map((product) => (
            <div
              key={product.id}
              className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-[#1E293B]">
                    {product.name}
                  </p>
                  {product.codigo && (
                    <p className="font-mono text-xs text-[#64748B]">
                      {product.codigo}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <StockBadge product={product} />
                </div>
              </div>

              {product.description && (
                <p className="mt-2 line-clamp-2 text-xs text-[#64748B]">
                  {product.description}
                </p>
              )}

              <p className="mt-2 text-sm font-medium text-[#1E293B]">
                {formatCurrency(product.price)}
              </p>

              <div className="mt-3 flex flex-wrap justify-end gap-1 border-t border-slate-100 pt-2">
                <button
                  onClick={() => setEntryProduct(product)}
                  className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-[#10B981] hover:bg-emerald-50"
                >
                  <PackagePlus className="h-3.5 w-3.5" />
                  Entrada
                </button>
                <button
                  onClick={() => setOutboundProduct(product)}
                  disabled={product.stock === 0}
                  className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-[#F59E0B] hover:bg-amber-50 disabled:opacity-40"
                >
                  <PackageMinus className="h-3.5 w-3.5" />
                  Salida
                </button>
                <button
                  onClick={() => setHistory({ id: product.id, name: product.name })}
                  className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-[#3B82F6] hover:bg-blue-50"
                >
                  <History className="h-3.5 w-3.5" />
                  Historial
                </button>
                <button
                  onClick={() => handleEdit(product)}
                  className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-[#3B82F6] hover:bg-blue-50"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </button>
                <button
                  onClick={() => setDeletingProduct(product)}
                  className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-[#EF4444] hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
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
              <TableHead className="hidden xl:table-cell">Descripcion</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead className="text-center">Stock</TableHead>
              <TableHead className="w-[160px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-[#64748B]">
                  {search ? "No se encontraron productos" : "No hay productos registrados"}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="hidden font-mono text-xs text-[#64748B] lg:table-cell">
                    {product.codigo || "—"}
                  </TableCell>
                  <TableCell className="font-medium text-[#1E293B]">
                    {product.name}
                  </TableCell>
                  <TableCell className="hidden max-w-[200px] truncate text-[#64748B] xl:table-cell">
                    {product.description || "—"}
                  </TableCell>
                  <TableCell className="text-right text-[#1E293B]">
                    {formatCurrency(product.price)}
                  </TableCell>
                  <TableCell className="text-center">
                    <StockBadge product={product} />
                  </TableCell>
                  <TableCell>
                    <TooltipProvider delayDuration={300}>
                      <div className="flex gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => setEntryProduct(product)}
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
                              onClick={() => setOutboundProduct(product)}
                              className="rounded-md p-1.5 text-[#64748B] hover:bg-slate-100 hover:text-[#F59E0B]"
                              disabled={product.stock === 0}
                            >
                              <PackageMinus className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Registrar salida (merma/muestra)</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => setHistory({ id: product.id, name: product.name })}
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
                              onClick={() => handleEdit(product)}
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
                              onClick={() => setDeletingProduct(product)}
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
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ProductForm
        key={editingProduct?.id ?? "new"}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        product={editingProduct}
      />

      <StockEntryDialog
        open={!!entryProduct}
        onClose={() => setEntryProduct(null)}
        product={entryProduct}
      />

      {outboundProduct && (
        <OutboundDialog
          open={!!outboundProduct}
          onClose={() => setOutboundProduct(null)}
          product={outboundProduct}
          customers={customers}
        />
      )}

      <MovementHistory
        open={!!history}
        onClose={() => setHistory(null)}
        productId={history?.id ?? null}
        productName={history?.name ?? ""}
      />

      <Dialog open={!!deletingProduct} onOpenChange={(open) => !open && setDeletingProduct(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Desactivar Producto</DialogTitle>
            <DialogDescription>
              Se desactivara el producto <strong>{deletingProduct?.name}</strong>.
              No aparecera en listados ni podra incluirse en nuevos pedidos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingProduct(null)} disabled={isPending}>
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
