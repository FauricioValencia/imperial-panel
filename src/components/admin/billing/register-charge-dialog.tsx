"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Textarea } from "@/components/ui/textarea";
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
import { addManualCharge } from "@/actions/billing";
import { formatCurrency } from "@/lib/format";
import type { ChargeType, Customer } from "@/types";

const chargeTypeLabels: Record<ChargeType, string> = {
  legacy_debt: "Deuda anterior (traspaso)",
  adjustment: "Ajuste administrativo",
  late_fee: "Recargo / mora",
  service: "Servicio adicional",
  other: "Otro",
};

interface RegisterChargeDialogProps {
  open: boolean;
  onClose: () => void;
  customer: Customer;
}

export function RegisterChargeDialog({
  open,
  onClose,
  customer,
}: RegisterChargeDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [amount, setAmount] = useState<number>(0);
  const [chargeType, setChargeType] = useState<ChargeType | "">("");
  const [reason, setReason] = useState("");

  const projectedBalance = customer.pending_balance + amount;
  const isHighAmount = amount >= 1_000_000;

  function reset() {
    setAmount(0);
    setChargeType("");
    setReason("");
    setError("");
    setConfirming(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleNext() {
    setError("");

    if (!chargeType) {
      setError("Selecciona un tipo de cargo");
      return;
    }
    if (!amount || amount <= 0) {
      setError("Ingresa un monto valido");
      return;
    }
    if (amount > 50_000_000) {
      setError("El monto no puede superar $50.000.000");
      return;
    }
    if (reason.trim().length < 5) {
      setError("Indica un motivo de al menos 5 caracteres");
      return;
    }

    setConfirming(true);
  }

  function handleConfirm() {
    if (!chargeType) return;

    startTransition(async () => {
      const result = await addManualCharge({
        customer_id: customer.id,
        amount,
        charge_type: chargeType,
        reason: reason.trim(),
      });

      if (result.success) {
        reset();
        onClose();
        router.refresh();
      } else {
        setError(result.error || "Error al registrar el cargo");
        setConfirming(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#1E293B]">
            {confirming ? "Confirmar cargo" : "Registrar cargo manual"}
          </DialogTitle>
          <DialogDescription>
            {customer.name} — Saldo actual: {formatCurrency(customer.pending_balance)}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!confirming ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#1E293B]">Tipo de cargo</label>
              <Select value={chargeType} onValueChange={(v) => setChargeType(v as ChargeType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el tipo" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(chargeTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#1E293B]">Monto</label>
              <CurrencyInput
                min={1}
                max={50_000_000}
                value={amount}
                onValueChange={setAmount}
                placeholder="Monto del cargo"
              />
              {isHighAmount && (
                <p className="text-xs text-[#F59E0B]">
                  Monto alto: revisa que sea correcto antes de confirmar.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#1E293B]">Motivo</label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe el motivo del cargo (visible en auditoria)"
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-[#64748B]">{reason.length}/500</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
              <p className="font-medium text-[#1E293B]">
                Esta operacion aumentara el saldo del cliente.
              </p>
              <p className="mt-1 text-[#64748B]">
                No se puede editar despues de registrar. Si te equivocas, debes anular el cargo.
              </p>
            </div>
            <dl className="space-y-2 rounded-lg border border-slate-200 p-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-[#64748B]">Tipo</dt>
                <dd className="font-medium text-[#1E293B]">
                  {chargeType ? chargeTypeLabels[chargeType] : ""}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#64748B]">Monto</dt>
                <dd className="font-medium text-[#EF4444]">{formatCurrency(amount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#64748B]">Saldo actual</dt>
                <dd className="font-medium text-[#1E293B]">
                  {formatCurrency(customer.pending_balance)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-2">
                <dt className="font-medium text-[#1E293B]">Saldo proyectado</dt>
                <dd className="font-bold text-[#EF4444]">{formatCurrency(projectedBalance)}</dd>
              </div>
              <div className="border-t border-slate-100 pt-2">
                <dt className="text-[#64748B]">Motivo</dt>
                <dd className="mt-1 text-[#1E293B]">{reason}</dd>
              </div>
            </dl>
          </div>
        )}

        <DialogFooter>
          {!confirming ? (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isPending}>
                Cancelar
              </Button>
              <Button
                onClick={handleNext}
                className="bg-[#1E3A5F] hover:bg-[#16304D]"
              >
                Continuar
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setConfirming(false)}
                disabled={isPending}
              >
                Volver
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isPending}
                className="bg-[#EF4444] hover:bg-[#DC2626]"
              >
                {isPending ? "Registrando..." : "Confirmar cargo"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
