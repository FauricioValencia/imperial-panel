"use client";

import { useEffect, useState, useTransition } from "react";
import { cancelOrder } from "@/actions/order-cancel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CancelOrderDialogProps {
  open: boolean;
  onClose: () => void;
  orderId: string;
  orderLabel: string;
  onSuccess: () => void;
}

export function CancelOrderDialog({
  open,
  onClose,
  orderId,
  orderLabel,
  onSuccess,
}: CancelOrderDialogProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setReason("");
      setError("");
    }
  }, [open]);

  function handleConfirm() {
    setError("");
    startTransition(async () => {
      const res = await cancelOrder({
        order_id: orderId,
        reason: reason.trim() || undefined,
      });
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error ?? "Error al cancelar");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !isPending && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cancelar pedido</DialogTitle>
          <DialogDescription className="text-left text-[#64748B]">
            {orderLabel}. Se revertirá el inventario según el tipo de pedido (bodega central o bodega
            del domiciliario), se eliminarán los pagos registrados para este pedido y se actualizará
            la cartera del cliente. Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="cancel-reason">Motivo (opcional)</Label>
          <Textarea
            id="cancel-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej.: cliente arrepentido, error de registro..."
            maxLength={500}
            disabled={isPending}
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            Volver
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending ? "Cancelando..." : "Confirmar cancelación"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
