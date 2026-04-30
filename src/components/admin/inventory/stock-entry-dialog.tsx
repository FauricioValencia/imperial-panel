"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { registerStockEntry } from "@/actions/inventory";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/format";
import type { ActionResponse, Product } from "@/types";

const initialState: ActionResponse = { success: false };

interface StockEntryDialogProps {
  open: boolean;
  onClose: () => void;
  product: Product | null;
}

function defaultExpirationDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

export function StockEntryDialog({ open, onClose, product }: StockEntryDialogProps) {
  const [state, formAction, isPending] = useActionState(registerStockEntry, initialState);
  const prevSuccessRef = useRef(false);

  const [quantity, setQuantity] = useState<number>(0);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [suggestedPrice, setSuggestedPrice] = useState<number>(0);
  const [noExpiration, setNoExpiration] = useState(false);

  useEffect(() => {
    if (state.success && !prevSuccessRef.current) {
      onClose();
    }
    prevSuccessRef.current = state.success;
  }, [state.success, onClose]);

  // Reset al abrir el dialog: patron "reset state on prop change".
  // Dialog de shadcn no desmonta el contenido cuando open cambia, asi que
  // resetearmos manualmente. Linter de React 19 lo flagea pero es valido.
  useEffect(() => {
    if (open) {
      prevSuccessRef.current = false;
      /* eslint-disable react-hooks/set-state-in-effect */
      setQuantity(0);
      setUnitCost(0);
      setSuggestedPrice(product?.price ?? 0);
      setNoExpiration(false);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [open, product]);

  // Preview de margen: usa suggested_price del lote si fue ingresado;
  // si no, cae al precio del producto. Asi el admin puede experimentar
  // con un precio distinto sin tocar el catalogo.
  const margin = useMemo(() => {
    if (!product || unitCost <= 0) return null;
    const referencePrice = suggestedPrice > 0 ? suggestedPrice : product.price;
    if (referencePrice <= 0) return null;
    const diff = referencePrice - unitCost;
    const pct = (diff / referencePrice) * 100;
    return { diff, pct, referencePrice, usingLotPrice: suggestedPrice > 0 };
  }, [product, unitCost, suggestedPrice]);

  const totalInvestment = quantity > 0 && unitCost > 0 ? quantity * unitCost : 0;

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#1E293B]">
            Crear lote — {product.name}
          </DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {state.error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {state.error}
            </div>
          )}

          <input type="hidden" name="product_id" value={product.id} />

          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-sm text-[#64748B]">
              Stock total actual:{" "}
              <span className="font-semibold text-[#1E293B]">{product.stock}</span>{" "}
              unidades · Disponible (vigente):{" "}
              <span className="font-semibold text-[#10B981]">
                {product.stock_available ?? product.stock}
              </span>
            </p>
            <p className="text-xs text-[#64748B] mt-1">
              Precio de venta:{" "}
              <span className="font-medium">{formatCurrency(product.price)}</span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Cantidad *</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                min="1"
                step="1"
                required
                value={quantity || ""}
                onChange={(e) => setQuantity(Math.max(0, Number(e.target.value) || 0))}
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit_cost">Costo unitario *</Label>
              <CurrencyInput
                id="unit_cost"
                name="unit_cost"
                required
                value={unitCost}
                onValueChange={setUnitCost}
                disabled={isPending}
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="suggested_price">
              Precio sugerido por lote
              <span className="ml-2 text-xs font-normal text-[#64748B]">
                (opcional · solo afecta el preview de margen)
              </span>
            </Label>
            <CurrencyInput
              id="suggested_price"
              name="suggested_price"
              value={suggestedPrice}
              onValueChange={setSuggestedPrice}
              disabled={isPending}
              placeholder={String(product.price)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expires_at">Vencimiento</Label>
              <Input
                id="expires_at"
                name="expires_at"
                type="date"
                defaultValue={defaultExpirationDate()}
                disabled={isPending || noExpiration}
                required={!noExpiration}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier">Proveedor</Label>
              <Input
                id="supplier"
                name="supplier"
                placeholder="Opcional"
                disabled={isPending}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="no_expiration"
              name="no_expiration"
              checked={noExpiration}
              onCheckedChange={(c) => setNoExpiration(c === true)}
              disabled={isPending}
            />
            <Label
              htmlFor="no_expiration"
              className="text-sm font-normal text-[#64748B]"
            >
              Producto no perecedero
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lot_number">Número de lote (opcional)</Label>
            <Input
              id="lot_number"
              name="lot_number"
              placeholder="Se genera automáticamente si lo dejas vacío"
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Ej: Compra a proveedor X, factura 1234"
              disabled={isPending}
              rows={2}
            />
          </div>

          {(totalInvestment > 0 || margin) && (() => {
            // 3 zonas de margen: <0 perdida (rojo), 0-20% bajo (ambar),
            // >=20% sano (verde). Coherente con badges de la tabla de lotes.
            const tone = !margin
              ? "neutral"
              : margin.pct < 0
              ? "loss"
              : margin.pct < 20
              ? "low"
              : "ok";
            const wrapperClass = {
              neutral: "border-slate-200 bg-slate-50",
              loss: "border-red-200 bg-red-50",
              low: "border-amber-200 bg-amber-50",
              ok: "border-emerald-200 bg-emerald-50",
            }[tone];
            const marginTextClass = {
              loss: "text-red-700",
              low: "text-amber-800",
              ok: "text-emerald-700",
              neutral: "text-[#1E293B]",
            }[tone];
            return (
              <div className={`rounded-lg border p-3 space-y-1 ${wrapperClass}`}>
                {totalInvestment > 0 && (
                  <p className="text-xs text-[#1E293B]">
                    Inversión total: <strong>{formatCurrency(totalInvestment)}</strong>
                  </p>
                )}
                {margin && (
                  <>
                    <p className={`text-xs ${marginTextClass}`}>
                      {margin.pct < 0 ? (
                        <>
                          Margen negativo: <strong>{formatCurrency(margin.diff)}</strong>{" "}
                          por unidad ({margin.pct.toFixed(1)}%)
                        </>
                      ) : (
                        <>
                          Utilidad bruta unitaria:{" "}
                          <strong>{formatCurrency(margin.diff)}</strong> ({margin.pct.toFixed(1)}%)
                        </>
                      )}
                    </p>
                    <p className="text-[10px] text-[#64748B]">
                      Calculado sobre{" "}
                      {margin.usingLotPrice ? "el precio sugerido del lote" : "el precio del producto"}{" "}
                      ({formatCurrency(margin.referencePrice)})
                    </p>
                  </>
                )}
              </div>
            );
          })()}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-[#10B981] hover:bg-[#059669]"
              disabled={isPending}
            >
              {isPending ? "Creando lote..." : "Crear lote"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
