"use client";

import { useActionState, useEffect, useRef } from "react";
import { createProduct, updateProduct } from "@/actions/inventory";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ActionResponse, Product } from "@/types";

const initialState: ActionResponse = { success: false };

interface ProductFormProps {
  open: boolean;
  onClose: () => void;
  product?: Product | null;
}

export function ProductForm({ open, onClose, product }: ProductFormProps) {
  const isEditing = !!product;
  const actionFn = isEditing
    ? updateProduct.bind(null, product.id)
    : createProduct;

  const [state, formAction, isPending] = useActionState(actionFn, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const prevSuccessRef = useRef(false);

  useEffect(() => {
    // Only close on transition from false → true (new success)
    if (state.success && !prevSuccessRef.current) {
      onClose();
    }
    prevSuccessRef.current = state.success;
  }, [state.success, onClose]);

  // Reset ref when dialog opens so next success triggers close
  useEffect(() => {
    if (open) {
      prevSuccessRef.current = false;
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
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
              <Label htmlFor="price">Precio *</Label>
              <CurrencyInput
                id="price"
                name="price"
                required
                defaultValue={product?.price ?? ""}
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
                  defaultValue={0}
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

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-[#1E3A5F] hover:bg-[#2d4f7a]" disabled={isPending}>
              {isPending ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear producto"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
