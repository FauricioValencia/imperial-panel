"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { registerPayment } from "@/actions/billing";
import { formatCurrency } from "@/lib/format";
import type { Order } from "@/types";

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
  const [amount, setAmount] = useState<number>(0);

  const totalToPay = deliveredTotal ?? order.total;
  const numAmount = amount;
  const pendingAfterPayment = totalToPay - numAmount;

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
    if (!numAmount || numAmount <= 0) {
      setError("Ingresa un monto valido");
      return;
    }
    if (numAmount > totalToPay) {
      setError("El abono no puede ser mayor al total entregado");
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

  function handleNoPay() {
    handleClose();
    router.refresh();
  }

  function handleClose() {
    setMode(null);
    setAmount(0);
    setError("");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-[#1E293B]">Registrar Pago</DialogTitle>
          <DialogDescription>
            {order.customer?.name}
          </DialogDescription>
        </DialogHeader>

        {/* Payment summary */}
        <div className="rounded-lg bg-slate-50 p-3 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-[#64748B]">Total entregado:</span>
            <span className="font-semibold text-[#1E293B]">{formatCurrency(totalToPay)}</span>
          </div>
          {totalToPay < order.total && (
            <div className="flex justify-between text-xs">
              <span className="text-[#64748B]">Total pedido original:</span>
              <span className="text-[#64748B] line-through">{formatCurrency(order.total)}</span>
            </div>
          )}
        </div>

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
              onClick={handleNoPay}
              disabled={isPending}
              variant="ghost"
              className="w-full min-h-[44px] text-[#64748B]"
            >
              Sin pago (queda en cartera)
            </Button>
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-[#F59E0B]" />
              <p className="text-xs text-amber-800">
                Si el cliente no paga, el total de{" "}
                <span className="font-semibold">{formatCurrency(totalToPay)}</span>{" "}
                quedara como saldo pendiente en su cartera.
              </p>
            </div>
          </div>
        )}

        {mode === "partial" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#1E293B]">
                Cuanto te pagaron?
              </label>
              <CurrencyInput
                min={1}
                max={totalToPay}
                value={amount}
                onValueChange={setAmount}
                placeholder="Monto recibido"
                className="text-lg min-h-[44px]"
              />
            </div>

            {numAmount > 0 && numAmount <= totalToPay && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-amber-800">Abono:</span>
                  <span className="font-medium text-[#10B981]">
                    {formatCurrency(numAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-amber-800">Queda debiendo:</span>
                  <span className="font-bold text-[#EF4444]">
                    {formatCurrency(pendingAfterPayment)}
                  </span>
                </div>
                <p className="text-xs text-amber-700 pt-1">
                  Este saldo se sumara a la cartera del cliente.
                </p>
              </div>
            )}

            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button
                onClick={handlePartialPayment}
                disabled={isPending || !numAmount || numAmount <= 0 || numAmount > totalToPay}
                className="w-full min-h-[48px] bg-[#10B981] hover:bg-[#059669]"
              >
                {isPending ? "Registrando..." : "Registrar abono"}
              </Button>
              <Button
                onClick={() => { setMode(null); setAmount(0); }}
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
