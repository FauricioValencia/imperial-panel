"use client";

import { useEffect, useState, useTransition } from "react";
import { returnStockFromCourier } from "@/actions/courier-warehouse";
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
import type { CourierInventorySummary } from "@/types";

interface ReturnCourierStockDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  courierId: string;
  courierName: string;
  // Inventario detallado por (lote) — no agregado, pues debemos devolver al lote exacto.
  detailedItems: {
    lot_id: string;
    product_id: string;
    product_name: string;
    quantity_remaining: number;
  }[];
}

export function ReturnCourierStockDialog({
  open,
  onClose,
  onSuccess,
  courierId,
  courierName,
  detailedItems,
}: ReturnCourierStockDialogProps) {
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setQuantities({});
      setNotes("");
      setError(null);
    }
  }, [open]);

  const lines = detailedItems
    .map((item) => {
      const raw = quantities[item.lot_id] ?? "";
      const qty = Number.parseInt(raw, 10);
      return { item, qty: Number.isFinite(qty) && qty > 0 ? qty : 0 };
    })
    .filter(({ qty }) => qty > 0);

  const overSomeLine = lines.some(({ item, qty }) => qty > item.quantity_remaining);
  const submitDisabled = isPending || lines.length === 0 || overSomeLine;

  const handleSubmit = () => {
    setError(null);
    startTransition(async () => {
      const res = await returnStockFromCourier({
        courier_id: courierId,
        lines: lines.map(({ item, qty }) => ({
          lot_id: item.lot_id,
          product_id: item.product_id,
          quantity: qty,
        })),
        notes: notes.trim() || undefined,
      });
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error ?? "Error al devolver");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[#1E293B]">
            Devolver stock móvil de {courierName} al central
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {detailedItems.length === 0 ? (
            <p className="text-sm text-[#64748B]">El courier no tiene stock móvil cargado.</p>
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {detailedItems.map((item) => (
                <div
                  key={item.lot_id}
                  className="flex items-center gap-3 rounded-lg border border-slate-200 p-3"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#1E293B]">{item.product_name}</p>
                    <p className="text-xs text-[#64748B]">
                      Disponible: {item.quantity_remaining}
                    </p>
                  </div>
                  <div className="w-24">
                    <Input
                      type="number"
                      min="0"
                      max={item.quantity_remaining}
                      placeholder="0"
                      value={quantities[item.lot_id] ?? ""}
                      onChange={(e) =>
                        setQuantities((prev) => ({ ...prev, [item.lot_id]: e.target.value }))
                      }
                      disabled={isPending}
                      className="min-h-11"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setQuantities((prev) => ({
                        ...prev,
                        [item.lot_id]: String(item.quantity_remaining),
                      }))
                    }
                    disabled={isPending}
                  >
                    Todo
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="return-notes">Notas</Label>
            <Textarea
              id="return-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isPending}
              rows={2}
              placeholder="Razon de la devolucion..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitDisabled}
              className="bg-[#10B981] hover:bg-[#059669] text-white"
            >
              {isPending ? "Devolviendo..." : "Devolver al central"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
