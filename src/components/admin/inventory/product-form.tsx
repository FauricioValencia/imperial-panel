"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { createProduct, updateProduct } from "@/actions/inventory";
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

interface ProductFormProps {
  open: boolean;
  onClose: () => void;
  product?: Product | null;
}

function defaultExpirationDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

export function ProductForm({ open, onClose, product }: ProductFormProps) {
  const isEditing = !!product;
  const actionFn = isEditing
    ? updateProduct.bind(null, product.id)
    : createProduct;

  const [state, formAction, isPending] = useActionState(actionFn, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const prevSuccessRef = useRef(false);

  // Local state for live preview / conditional fields
  const [price, setPrice] = useState<number>(product?.price ?? 0);
  const [stock, setStock] = useState<number>(0);
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
      setPrice(product?.price ?? 0);
      setStock(0);
      setUnitCost(0);
      setNoExpiration(false);
    }
  }, [open, product]);

  const showLotSection = !isEditing && stock > 0;

  const margin = useMemo(() => {
    if (!showLotSection || unitCost <= 0) return null;
    const diff = price - unitCost;
    const pct = price > 0 ? (diff / price) * 100 : 0;
    return { diff, pct };
  }, [showLotSection, price, unitCost]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#1E293B]">
            {isEditing ? "Editar Producto" : "Nuevo Producto"}
          </DialogTitle>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="space-y-4">
          {state.error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {state.error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                name="name"
                required
                defaultValue={product?.name ?? ""}
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="codigo">Código</Label>
              <Input
                id="codigo"
                name="codigo"
                placeholder="Ej: PROD-001"
                defaultValue={product?.codigo ?? ""}
                disabled={isPending}
                className="uppercase"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripcion</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={product?.description ?? ""}
              disabled={isPending}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Precio de venta *</Label>
              <CurrencyInput
                id="price"
                name="price"
                required
                value={price}
                onValueChange={setPrice}
                disabled={isPending}
                placeholder="0"
              />
            </div>

            {!isEditing && (
              <div className="space-y-2">
                <Label htmlFor="stock">Stock inicial</Label>
                <Input
                  id="stock"
                  name="stock"
                  type="number"
                  min="0"
                  step="1"
                  value={stock}
                  onChange={(e) => setStock(Math.max(0, Number(e.target.value) || 0))}
                  disabled={isPending}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="min_stock">Stock minimo</Label>
              <Input
                id="min_stock"
                name="min_stock"
                type="number"
                min="0"
                step="1"
                defaultValue={product?.min_stock ?? 5}
                disabled={isPending}
              />
            </div>
          </div>

          {isEditing && (
            <input type="hidden" name="stock" value={product.stock} />
          )}

          {showLotSection && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div>
                <p className="text-sm font-semibold text-[#1E293B]">Lote inicial</p>
                <p className="text-xs text-[#64748B]">
                  Como el producto entra con stock, debes registrar su costo y vencimiento.
                  El número de lote se genera automáticamente.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="initial_unit_cost">Costo unitario *</Label>
                  <CurrencyInput
                    id="initial_unit_cost"
                    name="initial_unit_cost"
                    required
                    value={unitCost}
                    onValueChange={setUnitCost}
                    disabled={isPending}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="initial_expires_at">Vencimiento</Label>
                  <Input
                    id="initial_expires_at"
                    name="initial_expires_at"
                    type="date"
                    defaultValue={defaultExpirationDate()}
                    disabled={isPending || noExpiration}
                    required={!noExpiration}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="initial_no_expiration"
                  name="initial_no_expiration"
                  checked={noExpiration}
                  onCheckedChange={(c) => setNoExpiration(c === true)}
                  disabled={isPending}
                />
                <Label
                  htmlFor="initial_no_expiration"
                  className="text-sm font-normal text-[#64748B]"
                >
                  Producto no perecedero
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="initial_supplier">Proveedor (opcional)</Label>
                <Input
                  id="initial_supplier"
                  name="initial_supplier"
                  placeholder="Ej: Distribuidora La 14"
                  disabled={isPending}
                />
              </div>

              {margin && (
                <div
                  className={
                    margin.diff >= 0
                      ? "rounded-md bg-emerald-50 border border-emerald-200 p-2 text-xs text-emerald-800"
                      : "rounded-md bg-red-50 border border-red-200 p-2 text-xs text-red-800"
                  }
                >
                  {margin.diff >= 0 ? (
                    <>
                      Utilidad bruta: <strong>{formatCurrency(margin.diff)}</strong>{" "}
                      ({margin.pct.toFixed(1)}% margen)
                    </>
                  ) : (
                    <>
                      Estás vendiendo por debajo del costo:{" "}
                      <strong>{formatCurrency(margin.diff)}</strong> por unidad
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-[#1E3A5F] hover:bg-[#2d4f7a]"
              disabled={isPending}
            >
              {isPending
                ? "Guardando..."
                : isEditing
                  ? "Guardar cambios"
                  : "Crear producto"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
