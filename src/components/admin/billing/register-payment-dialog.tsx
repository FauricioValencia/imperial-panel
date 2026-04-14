"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import type { Order, PaymentMethod, PaymentType } from "@/types";

interface RegisterPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  order: Order;
  totalPaid: number;
}

export function RegisterPaymentDialog({
  open,
  onClose,
  order,
  totalPaid,
}: RegisterPaymentDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [type, setType] = useState<PaymentType | "">("");
  const [method, setMethod] = useState<PaymentMethod>("cash");

  const remaining = order.total - totalPaid;

  function handleSubmit() {
    setError("");

    if (!type) {
      setError("Selecciona un tipo de pago");
      return;
    }

    if (!amount || amount <= 0) {
      setError("Ingresa un monto valido");
      return;
    }

    if (amount > remaining + 0.01) {
      setError(`El monto excede el saldo pendiente (${formatCurrency(remaining)})`);
      return;
    }

    startTransition(async () => {
      const result = await registerPayment({
        order_id: order.id,
        amount,
        type,
        payment_method: method,
      });

      if (result.success) {
        setAmount(0);
        setType("");
        setMethod("cash");
        onClose();
        router.refresh();
      } else {
        setError(result.error || "Error al registrar pago");
      }
    });
  }

  function handleClose() {
    setAmount(0);
    setError("");
    setType("");
    setMethod("cash");
    onClose();
  }

  function handleTypeChange(val: string) {
    const newType = val as PaymentType;
    setType(newType);
    if (newType === "full") {
      setAmount(remaining);
    } else {
      setAmount(0);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#1E293B]">Registrar Pago</DialogTitle>
          <DialogDescription>
            Pedido #{order.id.slice(0, 8)} — Total: {formatCurrency(order.total)}
            {totalPaid > 0 && ` — Pagado: ${formatCurrency(totalPaid)}`}
            {" — "}Pendiente: {formatCurrency(remaining)}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#1E293B]">Tipo de pago</label>
            <Select value={type} onValueChange={handleTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona tipo de pago" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Pago completo</SelectItem>
                <SelectItem value="partial">Abono</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[#1E293B]">Monto</label>
            <CurrencyInput
              min={1}
              max={remaining}
              value={amount}
              onValueChange={setAmount}
              placeholder="Monto del pago"
              disabled={!type || type === "full"}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[#1E293B]">Metodo de pago</label>
            <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Efectivo</SelectItem>
                <SelectItem value="transfer">Transferencia</SelectItem>
                <SelectItem value="nequi">Nequi</SelectItem>
                <SelectItem value="daviplata">Daviplata</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !type || amount <= 0}
            className="bg-[#10B981] hover:bg-[#059669]"
          >
            {isPending ? "Registrando..." : "Registrar pago"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
