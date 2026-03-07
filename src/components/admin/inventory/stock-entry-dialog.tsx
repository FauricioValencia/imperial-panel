"use client";

import { useActionState, useEffect, useRef } from "react";
import { registerStockEntry } from "@/actions/inventory";
import { Button } from "@/components/ui/button";
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

interface StockEntryDialogProps {
  open: boolean;
  onClose: () => void;
  product: Product | null;
}

export function StockEntryDialog({ open, onClose, product }: StockEntryDialogProps) {
  const [state, formAction, isPending] = useActionState(registerStockEntry, initialState);
  const prevSuccessRef = useRef(false);

  useEffect(() => {
    if (state.success && !prevSuccessRef.current) {
      onClose();
    }
    prevSuccessRef.current = state.success;
  }, [state.success, onClose]);

  useEffect(() => {
    if (open) {
      prevSuccessRef.current = false;
    }
  }, [open]);

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#1E293B]">
            Registrar Entrada - {product.name}
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
              Stock actual: <span className="font-semibold text-[#1E293B]">{product.stock}</span> unidades
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Cantidad a ingresar *</Label>
            <Input
              id="quantity"
              name="quantity"
              type="number"
              min="1"
              step="1"
              required
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Ej: Compra a proveedor X"
              disabled={isPending}
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-[#10B981] hover:bg-[#059669]" disabled={isPending}>
              {isPending ? "Registrando..." : "Registrar entrada"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
