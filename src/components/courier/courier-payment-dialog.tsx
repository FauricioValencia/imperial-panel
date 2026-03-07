"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { registerPayment } from "@/actions/billing";
import type { Order } from "@/types";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(value);
}

interface CourierPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  order: Order;
  deliveredTotal?: number;
}

export function CourierPaymentDialog({
  open,
  onClose,
  order,
  deliveredTotal,
}: CourierPaymentDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"full" | "partial" | null>(null);
  const [amount, setAmount] = useState("");

  const totalToPay = deliveredTotal ?? order.total;

  function handleFullPayment() {
    setError("");
    startTransition(async () => {
      const result = await registerPayment({
        order_id: order.id,
        amount: totalToPay,
        type: totalToPay === order.total ? "full" : "partial",
        payment_method: "cash",
      });

      if (result.success) {
        handleClose();
        router.refresh();
      } else {
        setError(result.error || "Error al registrar pago");
      }
    });
  }

  function handlePartialPayment() {
    setError("");
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setError("Ingresa un monto valido");
      return;
    }

    startTransition(async () => {
      const result = await registerPayment({
        order_id: order.id,
        amount: numAmount,
        type: "partial",
        payment_method: "cash",
      });

      if (result.success) {
        handleClose();
        router.refresh();
      } else {
        setError(result.error || "Error al registrar pago");
      }
    });
  }

  function handleClose() {
    setMode(null);
    setAmount("");
    setError("");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-[#1E293B]">Registrar Pago</DialogTitle>
          <DialogDescription>
            {order.customer?.name} — Total entregado: {formatCurrency(totalToPay)}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!mode && (
          <div className="space-y-3">
            <Button
              onClick={handleFullPayment}
              disabled={isPending}
              className="w-full min-h-[52px] bg-[#10B981] hover:bg-[#059669] text-lg"
            >
              {isPending ? "Registrando..." : `Pago completo ${formatCurrency(totalToPay)}`}
            </Button>
            <Button
              onClick={() => setMode("partial")}
              disabled={isPending}
              variant="outline"
              className="w-full min-h-[52px] text-lg"
            >
              Abono parcial
            </Button>
            <Button
              onClick={handleClose}
              disabled={isPending}
              variant="ghost"
              className="w-full min-h-[44px] text-[#64748B]"
            >
              Sin pago (cobrar despues)
            </Button>
          </div>
        )}

        {mode === "partial" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#1E293B]">
                Monto del abono
              </label>
              <Input
                type="number"
                min={1}
                max={totalToPay}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Monto"
                className="text-lg min-h-[44px]"
                autoFocus
              />
            </div>
            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button
                onClick={handlePartialPayment}
                disabled={isPending || !amount}
                className="w-full min-h-[48px] bg-[#10B981] hover:bg-[#059669]"
              >
                {isPending ? "Registrando..." : "Registrar abono"}
              </Button>
              <Button
                onClick={() => setMode(null)}
                disabled={isPending}
                variant="outline"
                className="w-full min-h-[44px]"
              >
                Volver
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
