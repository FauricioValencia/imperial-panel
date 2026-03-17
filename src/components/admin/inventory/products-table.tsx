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
import type { Customer, Product } from "@/types";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(value);
}

interface ProductsTableProps {
  initialProducts: Product[];
  customers?: Customer[];
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
          <AlertTriangle className="h-4 w-4 text-[#F59E0B]" />
          <p className="text-sm text-amber-800">
            <strong>{lowStockCount}</strong> producto{lowStockCount > 1 ? "s" : ""} con stock bajo o agotado
          </p>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
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

      <div className="rounded-lg border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Descripcion</TableHead>
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
              filtered.map((product) => {
                const lowStock = product.stock <= product.min_stock;
                const outOfStock = product.stock === 0;

                return (
                  <TableRow key={product.id}>
                    <TableCell className="text-[#64748B] font-mono text-xs">
                      {product.codigo || "—"}
                    </TableCell>
                    <TableCell className="font-medium text-[#1E293B]">
                      {product.name}
                    </TableCell>
                    <TableCell className="text-[#64748B] max-w-[200px] truncate">
                      {product.description || "—"}
                    </TableCell>
                    <TableCell className="text-right text-[#1E293B]">
                      {formatCurrency(product.price)}
                    </TableCell>
                    <TableCell className="text-center">
                      {outOfStock ? (
                        <Badge variant="destructive" className="bg-[#EF4444]">
                          Agotado
                        </Badge>
                      ) : lowStock ? (
                        <Badge className="bg-[#F59E0B] text-white hover:bg-[#F59E0B]">
                          {product.stock} (min: {product.min_stock})
                        </Badge>
                      ) : (
                        <span className="text-[#10B981] font-medium">{product.stock}</span>
                      )}
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
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <ProductForm
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
