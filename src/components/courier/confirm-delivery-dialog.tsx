"use client";

import { useState, useTransition } from "react";
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
import { confirmDelivery } from "@/actions/orders";
import type { Order } from "@/types";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(value);
}

interface ConfirmDeliveryDialogProps {
  open: boolean;
  onClose: () => void;
  onDelivered: (deliveredTotal: number) => void;
  order: Order;
}

export function ConfirmDeliveryDialog({
  open,
  onClose,
  onDelivered,
  order,
}: ConfirmDeliveryDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const items = order.items || [];

  // Track delivered quantities (default = full quantity)
  const [delivered, setDelivered] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const item of items) {
      initial[item.id] = item.quantity;
    }
    return initial;
  });

  function resetState() {
    const initial: Record<string, number> = {};
    for (const item of items) {
      initial[item.id] = item.quantity;
    }
    setDelivered(initial);
    setError("");
  }

  function updateDelivered(itemId: string, qty: number) {
    setDelivered((prev) => ({ ...prev, [itemId]: qty }));
  }

  // Calculate totals based on delivered quantities
  const deliveredTotal = items.reduce((sum, item) => {
    const qty = delivered[item.id] ?? item.quantity;
    return sum + qty * item.unit_price;
  }, 0);

  const hasReturns = items.some((item) => {
    const deliveredQty = delivered[item.id] ?? item.quantity;
    return deliveredQty < item.quantity;
  });

  function handleConfirm() {
    setError("");

    // Validate quantities
    for (const item of items) {
      const qty = delivered[item.id] ?? item.quantity;
      if (qty < 0 || qty > item.quantity) {
        setError(`Cantidad invalida para ${item.product?.name}`);
        return;
      }
    }

    // Build returned items list from delivered quantities
    const returnedItems = items
      .filter((item) => {
        const deliveredQty = delivered[item.id] ?? item.quantity;
        return deliveredQty < item.quantity;
      })
      .map((item) => ({
        order_item_id: item.id,
        returned_quantity: item.quantity - (delivered[item.id] ?? item.quantity),
      }));

    startTransition(async () => {
      const result = await confirmDelivery(
        order.id,
        returnedItems.length > 0 ? returnedItems : undefined
      );

      if (result.success) {
        onDelivered(deliveredTotal);
        // Don't refresh here — the payment dialog needs to show first.
        // Refresh happens when the payment dialog closes.
      } else {
        setError(result.error || "Error al confirmar entrega");
      }
    });
  }

  function handleClose() {
    resetState();
    onClose();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) handleClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#1E293B]">
            Confirmar Entrega
          </DialogTitle>
          <DialogDescription>
            Indica cuantas unidades entregaste de cada producto
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {items.map((item) => {
            const qty = delivered[item.id] ?? item.quantity;
            const returnedQty = item.quantity - qty;
            return (
              <div key={item.id} className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1E293B] truncate">
                    {item.product?.name || "Producto"}
                  </p>
                  <p className="text-xs text-[#64748B]">
                    Pedido: {item.quantity} — {formatCurrency(item.unit_price)} c/u
                  </p>
                  {returnedQty > 0 && (
                    <p className="text-xs text-[#EF4444]">
                      Devuelve: {returnedQty}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-[#64748B]">Entregado:</label>
                  <Input
                    type="number"
                    min={0}
                    max={item.quantity}
                    value={qty}
                    onChange={(e) =>
                      updateDelivered(item.id, parseInt(e.target.value) || 0)
                    }
                    className="w-16 text-center"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-slate-100 pt-3 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-[#64748B]">Total pedido:</span>
            <span className="text-[#1E293B]">{formatCurrency(order.total)}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold">
            <span className="text-[#1E293B]">Total entregado:</span>
            <span className={deliveredTotal < order.total ? "text-[#F59E0B]" : "text-[#10B981]"}>
              {formatCurrency(deliveredTotal)}
            </span>
          </div>
          {hasReturns && (
            <p className="text-xs text-[#F59E0B]">
              Algunos productos no se entregaron completos
            </p>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            onClick={handleConfirm}
            disabled={isPending}
            className="w-full min-h-[48px] bg-[#10B981] hover:bg-[#059669]"
          >
            {isPending ? "Procesando..." : "Confirmar entrega"}
          </Button>
          <Button
            onClick={handleClose}
            disabled={isPending}
            variant="outline"
            className="w-full min-h-[44px]"
          >
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
