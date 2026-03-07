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
import { confirmDelivery } from "@/actions/orders";
import type { Order } from "@/types";

interface ConfirmDeliveryDialogProps {
  open: boolean;
  onClose: () => void;
  order: Order;
}

export function ConfirmDeliveryDialog({
  open,
  onClose,
  order,
}: ConfirmDeliveryDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [returns, setReturns] = useState<Record<string, number>>({});

  const items = order.items || [];

  function updateReturn(itemId: string, qty: number) {
    setReturns((prev) => ({ ...prev, [itemId]: qty }));
  }

  function handleConfirm() {
    setError("");

    const returnedItems = Object.entries(returns)
      .filter(([, qty]) => qty > 0)
      .map(([order_item_id, returned_quantity]) => ({
        order_item_id,
        returned_quantity,
      }));

    if (returnedItems.length === 0) {
      setError("Selecciona al menos un producto para devolver");
      return;
    }

    // Validate quantities
    for (const ri of returnedItems) {
      const item = items.find((i) => i.id === ri.order_item_id);
      if (item && ri.returned_quantity > item.quantity) {
        setError(`No puedes devolver mas de ${item.quantity} unidades de ${item.product?.name}`);
        return;
      }
    }

    startTransition(async () => {
      const result = await confirmDelivery(order.id, returnedItems);
      if (result.success) {
        setReturns({});
        onClose();
        router.refresh();
      } else {
        setError(result.error || "Error al confirmar entrega");
      }
    });
  }

  function handleClose() {
    setReturns({});
    setError("");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#1E293B]">Registrar Devolucion</DialogTitle>
          <DialogDescription>
            Indica la cantidad devuelta de cada producto
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#1E293B] truncate">
                  {item.product?.name || "Producto"}
                </p>
                <p className="text-xs text-[#64748B]">
                  Enviado: {item.quantity}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-[#64748B]">Dev:</label>
                <Input
                  type="number"
                  min={0}
                  max={item.quantity}
                  value={returns[item.id] || 0}
                  onChange={(e) => updateReturn(item.id, parseInt(e.target.value) || 0)}
                  className="w-16 text-center"
                />
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isPending}
            className="bg-[#EF4444] hover:bg-[#DC2626]"
          >
            {isPending ? "Procesando..." : "Confirmar devolucion"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
