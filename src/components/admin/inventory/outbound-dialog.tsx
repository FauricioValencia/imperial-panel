"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { registerOutbound } from "@/actions/inventory";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ActionResponse, Customer, Product } from "@/types";

const initialState: ActionResponse = { success: false };

interface OutboundDialogProps {
  open: boolean;
  onClose: () => void;
  product: Product;
  customers: Customer[];
}

export function OutboundDialog({ open, onClose, product, customers }: OutboundDialogProps) {
  const [state, formAction, isPending] = useActionState(registerOutbound, initialState);
  const [reason, setReason] = useState<"merma" | "muestra">("merma");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const prevSuccessRef = useRef(false);

  const submitDisabled = isPending || (reason === "muestra" && !selectedCustomerId);

  useEffect(() => {
    if (state.success && !prevSuccessRef.current) {
      onClose();
    }
    prevSuccessRef.current = state.success;
  }, [state.success, onClose]);

  useEffect(() => {
    if (open) {
      prevSuccessRef.current = false;
      setReason("merma");
      setSelectedCustomerId("");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#1E293B]">
            Registrar Salida — {product.name}
          </DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="product_id" value={product.id} />

          {state.error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {state.error}
            </div>
          )}

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            <span className="text-[#64748B]">Stock actual: </span>
            <span className="font-semibold text-[#1E293B]">{product.stock} unidades</span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Razón de salida *</Label>
            <Select
              name="reason"
              value={reason}
              onValueChange={(v) => setReason(v as "merma" | "muestra")}
              disabled={isPending}
            >
              <SelectTrigger id="reason">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="merma">Merma (pérdida / deterioro)</SelectItem>
                <SelectItem value="muestra">Muestra a cliente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {reason === "muestra" && (
            <div className="space-y-2">
              <Label htmlFor="customer_id">Cliente *</Label>
              <Select
                name="customer_id"
                value={selectedCustomerId}
                onValueChange={setSelectedCustomerId}
                disabled={isPending}
              >
                <SelectTrigger id="customer_id">
                  <SelectValue placeholder="Seleccionar cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                      {c.reference_code && (
                        <span className="ml-2 text-xs text-[#64748B]">
                          ({c.reference_code})
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!selectedCustomerId && (
                <p className="text-xs text-[#EF4444]">Requerido para salidas tipo muestra</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="quantity">Cantidad *</Label>
            <Input
              id="quantity"
              name="quantity"
              type="number"
              min="1"
              max={product.stock}
              required
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              name="notes"
              disabled={isPending}
              rows={2}
              placeholder={reason === "merma" ? "Motivo de la merma..." : "Observaciones de la muestra..."}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-[#F59E0B] hover:bg-[#d97706] text-white"
              disabled={submitDisabled}
            >
              {isPending ? "Registrando..." : "Registrar salida"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
