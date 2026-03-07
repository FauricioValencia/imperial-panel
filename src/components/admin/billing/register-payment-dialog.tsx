"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import type { Order, PaymentMethod, PaymentType } from "@/types";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(value);
}

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
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<PaymentType>("full");
  const [method, setMethod] = useState<PaymentMethod>("cash");

  const remaining = order.total - totalPaid;

  function handleSubmit() {
    setError("");
    const numAmount = Number(amount);

    if (!numAmount || numAmount <= 0) {
      setError("Ingresa un monto valido");
      return;
    }

    if (numAmount > remaining + 0.01) {
      setError(`El monto excede el saldo pendiente (${formatCurrency(remaining)})`);
      return;
    }

    startTransition(async () => {
      const result = await registerPayment({
        order_id: order.id,
        amount: numAmount,
        type,
        payment_method: method,
      });

      if (result.success) {
        setAmount("");
        setType("full");
        setMethod("cash");
        onClose();
        router.refresh();
      } else {
        setError(result.error || "Error al registrar pago");
      }
    });
  }

  function handleClose() {
    setAmount("");
    setError("");
    setType("full");
    setMethod("cash");
    onClose();
  }

  function handleTypeChange(val: string) {
    setType(val as PaymentType);
    if (val === "full") {
      setAmount(String(remaining));
    } else {
      setAmount("");
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
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Pago completo</SelectItem>
                <SelectItem value="partial">Abono</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[#1E293B]">Monto</label>
            <Input
              type="number"
              min={1}
              max={remaining}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Monto del pago"
              disabled={type === "full"}
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
            disabled={isPending || !amount}
            className="bg-[#10B981] hover:bg-[#059669]"
          >
            {isPending ? "Registrando..." : "Registrar pago"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
