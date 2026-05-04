"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { CustomerAgreedPricesTable } from "@/components/admin/customers/customer-agreed-prices-table";
import { deactivateCustomerPrice, upsertCustomerPrice } from "@/actions/customer-prices";
import {
  formatCurrency,
  formatDecimalGroupingInput,
  parseDecimalGroupingInput,
} from "@/lib/format";
import { gananciaEstimadaPorUnidad } from "@/lib/customer-pricing";
import type { CustomerPrice, Product } from "@/types";

interface CustomerAgreedPricesSectionProps {
  customerId: string;
  customerName: string;
  initialPrices: CustomerPrice[];
  products: Product[];
  /** CPP por `product_id` desde `current_inventory_valuation`. */
  inventoryCppByProductId: Record<string, number | null>;
}

export function CustomerAgreedPricesSection({
  customerId,
  customerName,
  initialPrices,
  products,
  inventoryCppByProductId,
}: CustomerAgreedPricesSectionProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const precioSheetNumerico = parseDecimalGroupingInput(customPrice);
  const cppProductoSeleccionado = productId ? inventoryCppByProductId[productId] : undefined;
  const tieneCpp =
    cppProductoSeleccionado != null && Number.isFinite(Number(cppProductoSeleccionado));
  const precioSheetValido =
    Number.isFinite(precioSheetNumerico) && precioSheetNumerico > 0;
  const gananciaSheet =
    productId && precioSheetValido
      ? gananciaEstimadaPorUnidad(precioSheetNumerico, cppProductoSeleccionado)
      : null;

  function resetForm() {
    setProductId("");
    setCustomPrice("");
    setNotes("");
    setError("");
  }

  function handleSave() {
    setError("");
    const price = parseDecimalGroupingInput(customPrice);
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
              <TableHead
                className="text-right"
                title="Precio acordado menos costo promedio ponderado del inventario vigente (por unidad)."
              >
                Ganancia / u.
              </TableHead>
              <TableHead className="w-[100px]">Estado</TableHead>
              <TableHead className="w-[90px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialPrices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-[#64748B]">
                  Sin precios acordados. Usa el precio de lista en pedidos.
                </TableCell>
              </TableRow>
            ) : (
              initialPrices.map((row) => {
                const list = row.product?.price ?? productById.get(row.product_id)?.price ?? 0;
                const diffPct =
                  list > 0 ? Math.round(((row.custom_price - list) / list) * 1000) / 10 : null;
                const cpp = inventoryCppByProductId[row.product_id];
                const ganancia = gananciaEstimadaPorUnidad(row.custom_price, cpp);
                const margenSobreVentaPct =
                  ganancia != null && row.custom_price > 0
                    ? Math.round((ganancia / row.custom_price) * 1000) / 10
                    : null;
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
                    <TableCell className="text-right tabular-nums">
                      {ganancia == null ? (
                        <span className="text-sm text-[#64748B]">Sin CPP</span>
                      ) : (
                        <>
                          <span
                            className={
                              ganancia >= 0 ? "font-medium text-[#10B981]" : "font-medium text-[#EF4444]"
                            }
                          >
                            {formatCurrency(ganancia)}
                          </span>
                          {margenSobreVentaPct != null && (
                            <span className="ml-2 text-xs text-[#64748B]">
                              ({margenSobreVentaPct > 0 ? "+" : ""}
                              {margenSobreVentaPct}%)
                            </span>
                          )}
                        </>
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
                            setCustomPrice(formatDecimalGroupingInput(String(row.custom_price)));
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
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b px-6 pb-5 pt-6 sm:px-10 sm:pb-6 sm:pt-7">
            <SheetTitle className="pr-10 text-base leading-snug sm:pr-8">Precio acordado</SheetTitle>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-10 overflow-y-auto px-6 pb-8 pt-8 sm:gap-12 sm:px-10 sm:pb-10 sm:pt-10">
            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <div className="flex flex-col gap-3">
              <Label htmlFor="agreed-product" className="text-sm leading-normal text-[#64748B]">
                Producto
              </Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger id="agreed-product" className="h-11 min-h-11 w-full min-w-0 max-w-none">
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
            <div className="flex flex-col gap-3">
              <Label htmlFor="agreed-price" className="text-sm leading-normal text-[#64748B]">
                Precio acordado
              </Label>
              <Input
                id="agreed-price"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={customPrice}
                onChange={(e) => setCustomPrice(formatDecimalGroupingInput(e.target.value))}
                placeholder="0"
                className="h-11 w-full min-w-0 tabular-nums"
              />
              {productId && (
                <p className="text-xs leading-relaxed text-[#64748B]">
                  {!tieneCpp && <>Sin costo promedio (CPP) en inventario vigente para este producto.</>}
                  {tieneCpp && !precioSheetValido && <>Indica un precio acordado mayor a cero para ver la ganancia por unidad.</>}
                  {tieneCpp && precioSheetValido && gananciaSheet != null && (
                    <>
                      Ganancia estimada por unidad (acordado − CPP):{" "}
                      <span
                        className={
                          gananciaSheet >= 0 ? "font-medium text-[#10B981]" : "font-medium text-[#EF4444]"
                        }
                      >
                        {formatCurrency(gananciaSheet)}
                      </span>
                    </>
                  )}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-3">
              <Label htmlFor="agreed-notes" className="text-sm leading-normal text-[#64748B]">
                Notas (opcional)
              </Label>
              <Input
                id="agreed-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
                className="h-11 w-full min-w-0"
              />
            </div>
          </div>
          <SheetFooter className="border-t px-6 py-6 sm:px-10 sm:py-7">
            <div className="flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="outline" type="button" onClick={() => setOpen(false)} disabled={isPending} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button type="button" className="w-full bg-[#1E3A5F] hover:bg-[#2d4f7a] sm:w-auto" onClick={handleSave} disabled={isPending}>
                {isPending ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
