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
  const [noExpiration, setNoExpiration] = useState(false);

  useEffect(() => {
    if (state.success && !prevSuccessRef.current) {
      onClose();
    }
    prevSuccessRef.current = state.success;
  }, [state.success, onClose]);

  useEffect(() => {
    if (open) {
      prevSuccessRef.current = false;
      setQuantity(0);
      setUnitCost(0);
      setNoExpiration(false);
    }
  }, [open]);

  const margin = useMemo(() => {
    if (!product || unitCost <= 0) return null;
    const diff = product.price - unitCost;
    const pct = product.price > 0 ? (diff / product.price) * 100 : 0;
    return { diff, pct };
  }, [product, unitCost]);

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

          {(totalInvestment > 0 || margin) && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1">
              {totalInvestment > 0 && (
                <p className="text-xs text-[#1E293B]">
                  Inversión total:{" "}
                  <strong>{formatCurrency(totalInvestment)}</strong>
                </p>
              )}
              {margin && (
                <p
                  className={
                    margin.diff >= 0
                      ? "text-xs text-emerald-700"
                      : "text-xs text-red-700"
                  }
                >
                  {margin.diff >= 0 ? (
                    <>
                      Utilidad bruta unitaria:{" "}
                      <strong>{formatCurrency(margin.diff)}</strong> ({margin.pct.toFixed(1)}%)
                    </>
                  ) : (
                    <>
                      Margen negativo: vendes a{" "}
                      <strong>{formatCurrency(margin.diff)}</strong> por debajo del costo
                    </>
                  )}
                </p>
              )}
            </div>
          )}

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
