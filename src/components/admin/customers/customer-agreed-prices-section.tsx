"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { deactivateCustomerPrice, upsertCustomerPrice } from "@/actions/customer-prices";
import { formatCurrency } from "@/lib/format";
import type { CustomerPrice, Product } from "@/types";

interface CustomerAgreedPricesSectionProps {
  customerId: string;
  customerName: string;
  initialPrices: CustomerPrice[];
  products: Product[];
}

export function CustomerAgreedPricesSection({
  customerId,
  customerName,
  initialPrices,
  products,
}: CustomerAgreedPricesSectionProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  function resetForm() {
    setProductId("");
    setCustomPrice("");
    setNotes("");
    setError("");
  }

  function handleSave() {
    setError("");
    const price = Number(customPrice);
    if (!productId) {
      setError("Seleccione un producto");
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setError("Indique un precio valido mayor a cero");
      return;
    }
    startTransition(async () => {
      const res = await upsertCustomerPrice({
        customer_id: customerId,
        product_id: productId,
        custom_price: price,
        notes: notes.trim() || undefined,
      });
      if (!res.success) {
        setError(res.error ?? "Error al guardar");
        return;
      }
      setOpen(false);
      resetForm();
      router.refresh();
    });
  }

  function handleDeactivate(priceId: string) {
    startTransition(async () => {
      const res = await deactivateCustomerPrice(priceId);
      if (!res.success) {
        alert(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[#64748B]">
          Precios distintos al catalogo para <span className="font-medium text-[#1E293B]">{customerName}</span>.
        </p>
        <Button
          type="button"
          size="sm"
          className="bg-[#1E3A5F] hover:bg-[#2d4f7a]"
          onClick={() => {
            resetForm();
            setOpen(true);
          }}
        >
          <Plus className="mr-1 h-4 w-4" />
          Agregar o editar acuerdo
        </Button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead className="text-right">Lista</TableHead>
              <TableHead className="text-right">Acordado</TableHead>
              <TableHead className="w-[100px]">Estado</TableHead>
              <TableHead className="w-[90px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialPrices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-[#64748B]">
                  Sin precios acordados. Usa el precio de lista en pedidos.
                </TableCell>
              </TableRow>
            ) : (
              initialPrices.map((row) => {
                const list = row.product?.price ?? productById.get(row.product_id)?.price ?? 0;
                const diffPct =
                  list > 0 ? Math.round(((row.custom_price - list) / list) * 1000) / 10 : null;
                return (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium text-[#1E293B]">
                      {row.product?.name ?? productById.get(row.product_id)?.name ?? row.product_id}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-[#64748B]">
                      {formatCurrency(list)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span className="font-medium text-[#1E293B]">{formatCurrency(row.custom_price)}</span>
                      {diffPct !== null && diffPct !== 0 && (
                        <span className="ml-2 text-xs text-[#64748B]">
                          ({diffPct > 0 ? "+" : ""}
                          {diffPct}%)
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.active ? (
                        <Badge className="bg-[#10B981]">Activo</Badge>
                      ) : (
                        <Badge variant="secondary">Inactivo</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.active ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          disabled={isPending}
                          onClick={() => handleDeactivate(row.id)}
                        >
                          Desactivar
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          className="h-auto px-0 text-xs text-[#3B82F6]"
                          disabled={isPending}
                          onClick={() => {
                            setProductId(row.product_id);
                            setCustomPrice(String(row.custom_price));
                            setNotes(row.notes ?? "");
                            setOpen(true);
                          }}
                        >
                          Reactivar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="flex flex-col sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Precio acordado</SheetTitle>
          </SheetHeader>
          <div className="mt-4 flex flex-1 flex-col gap-4 overflow-y-auto px-1">
            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</div>
            )}
            <div className="space-y-2">
              <Label htmlFor="agreed-product">Producto</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger id="agreed-product">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — {formatCurrency(p.price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="agreed-price">Precio acordado</Label>
              <Input
                id="agreed-price"
                type="number"
                min={0.01}
                step={0.01}
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agreed-notes">Notas (opcional)</Label>
              <Input
                id="agreed-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
              />
            </div>
          </div>
          <SheetFooter className="mt-auto border-t pt-4">
            <Button variant="outline" type="button" onClick={() => setOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="button" className="bg-[#1E3A5F]" onClick={handleSave} disabled={isPending}>
              {isPending ? "Guardando..." : "Guardar"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
