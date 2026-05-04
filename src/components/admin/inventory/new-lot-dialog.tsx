"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { getRecentLotNumbers, registerStockEntry } from "@/actions/inventory";
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
import { bogotaAddDaysYmd, bogotaTodayYmd } from "@/lib/date";
import { ProductCombobox } from "./product-combobox";
import type { ActionResponse, Product } from "@/types";

const initialState: ActionResponse = { success: false };
const RECENT_LOTS_COUNT = 5;

interface NewLotDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
  products: Product[];
}

function defaultExpirationDate(): string {
  return bogotaAddDaysYmd(bogotaTodayYmd(), 30);
}

export function NewLotDialog({ open, onClose, onCreated, products }: NewLotDialogProps) {
  const [state, formAction, isPending] = useActionState(registerStockEntry, initialState);
  const prevSuccessRef = useRef(false);
  const lotNumberInputRef = useRef<HTMLInputElement>(null);

  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState<number>(0);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [suggestedPrice, setSuggestedPrice] = useState<number>(0);
  const [noExpiration, setNoExpiration] = useState(false);
  const [recentLotNumbers, setRecentLotNumbers] = useState<string[]>([]);

  const product = useMemo(
    () => products.find((p) => p.id === productId) ?? null,
    [products, productId]
  );

  useEffect(() => {
    if (state.success && !prevSuccessRef.current) {
      onCreated?.();
      onClose();
    }
    prevSuccessRef.current = state.success;
  }, [state.success, onClose, onCreated]);

  useEffect(() => {
    if (state.error && /n[uú]mero/i.test(state.error) && lotNumberInputRef.current) {
      lotNumberInputRef.current.focus();
    }
  }, [state.error]);

  // Reset al abrir
  useEffect(() => {
    if (open) {
      prevSuccessRef.current = false;
      /* eslint-disable react-hooks/set-state-in-effect */
      setProductId("");
      setQuantity(0);
      setUnitCost(0);
      setSuggestedPrice(0);
      setNoExpiration(false);
      setRecentLotNumbers([]);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [open]);

  function handleProductChange(newId: string) {
    setProductId(newId);
    const newProduct = products.find((p) => p.id === newId);
    if (!newProduct) {
      setSuggestedPrice(0);
      setRecentLotNumbers([]);
      return;
    }
    setSuggestedPrice(newProduct.price);
    getRecentLotNumbers(newId, RECENT_LOTS_COUNT).then((res) => {
      if (res.success && res.data) setRecentLotNumbers(res.data);
    });
  }

  const margin = useMemo(() => {
    if (!product || unitCost <= 0) return null;
    const referencePrice = suggestedPrice > 0 ? suggestedPrice : product.price;
    if (referencePrice <= 0) return null;
    const diff = referencePrice - unitCost;
    const pct = (diff / referencePrice) * 100;
    return { diff, pct, referencePrice, usingLotPrice: suggestedPrice > 0 };
  }, [product, unitCost, suggestedPrice]);

  const totalInvestment = quantity > 0 && unitCost > 0 ? quantity * unitCost : 0;

  const submitDisabled = isPending || !product || quantity <= 0 || unitCost <= 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#1E293B]">Nuevo lote</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {state.error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {state.error}
            </div>
          )}

          <input type="hidden" name="product_id" value={productId} />

          <div className="space-y-2">
            <Label htmlFor="product-id">Producto *</Label>
            <ProductCombobox
              id="product-id"
              products={products}
              value={productId}
              onChange={handleProductChange}
              disabled={isPending}
            />
          </div>

          {product && (
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
          )}

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
                disabled={isPending || !product}
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
                disabled={isPending || !product}
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
              disabled={isPending || !product}
              placeholder={product ? String(product.price) : "0"}
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
                disabled={isPending || noExpiration || !product}
                required={!noExpiration}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier">Proveedor</Label>
              <Input
                id="supplier"
                name="supplier"
                placeholder="Opcional"
                disabled={isPending || !product}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="no_expiration"
              name="no_expiration"
              checked={noExpiration}
              onCheckedChange={(c) => setNoExpiration(c === true)}
              disabled={isPending || !product}
            />
            <Label
              htmlFor="no_expiration"
              className="text-sm font-normal text-[#64748B]"
            >
              Producto no perecedero
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lot_number">Numero de lote (opcional)</Label>
            <Input
              ref={lotNumberInputRef}
              id="lot_number"
              name="lot_number"
              placeholder="Se genera automaticamente si lo dejas vacio"
              disabled={isPending || !product}
              maxLength={50}
            />
            {recentLotNumbers.length > 0 && (
              <p className="text-xs text-[#64748B]">
                Lotes recientes:{" "}
                <span className="font-mono">{recentLotNumbers.join(" · ")}</span>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Ej: Compra a proveedor X, factura 1234"
              disabled={isPending || !product}
              rows={2}
            />
          </div>

          {(totalInvestment > 0 || margin) && (() => {
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
                    Inversion total: <strong>{formatCurrency(totalInvestment)}</strong>
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
                      {margin.usingLotPrice
                        ? "el precio sugerido del lote"
                        : "el precio del producto"}{" "}
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
              disabled={submitDisabled}
            >
              {isPending ? "Creando lote..." : "Crear lote"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
