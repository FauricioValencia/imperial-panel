"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
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
import { getMyInventory } from "@/actions/courier-warehouse";
import { formatCurrency } from "@/lib/format";
import type {
  ConfirmDeliverySwapInput,
  CourierInventorySummary,
  Order,
} from "@/types";

interface ConfirmDeliveryDialogProps {
  open: boolean;
  onClose: () => void;
  onDelivered: (deliveredTotal: number) => void;
  order: Order;
}

interface SwapDraft {
  key: string;
  order_item_id: string;
  swapped_product_id: string;
  swapped_quantity: number;
}

let swapKeySeq = 0;
function nextSwapKey() {
  swapKeySeq += 1;
  return `swap-${swapKeySeq}-${Date.now()}`;
}

export function ConfirmDeliveryDialog({
  open,
  onClose,
  onDelivered,
  order,
}: ConfirmDeliveryDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [stockMovil, setStockMovil] = useState<CourierInventorySummary[]>([]);
  const [stockMovilLoaded, setStockMovilLoaded] = useState(false);

  const items = order.items || [];

  const [delivered, setDelivered] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const item of items) initial[item.id] = item.quantity;
    return initial;
  });
  const [swapsByItem, setSwapsByItem] = useState<Record<string, SwapDraft[]>>({});

  // Cargar stock movil del courier solo cuando el dialog se abre por primera vez.
  useEffect(() => {
    if (!open || stockMovilLoaded) return;
    void (async () => {
      const res = await getMyInventory();
      if (res.success && res.data) {
        setStockMovil(res.data);
      }
      setStockMovilLoaded(true);
    })();
  }, [open, stockMovilLoaded]);

  function resetState() {
    const initial: Record<string, number> = {};
    for (const item of items) initial[item.id] = item.quantity;
    setDelivered(initial);
    setSwapsByItem({});
    setError("");
  }

  function updateDelivered(itemId: string, qty: number) {
    setDelivered((prev) => ({ ...prev, [itemId]: qty }));
  }

  function addSwap(itemId: string) {
    setSwapsByItem((prev) => ({
      ...prev,
      [itemId]: [
        ...(prev[itemId] ?? []),
        {
          key: nextSwapKey(),
          order_item_id: itemId,
          swapped_product_id: "",
          swapped_quantity: 1,
        },
      ],
    }));
  }

  function updateSwap(itemId: string, key: string, patch: Partial<SwapDraft>) {
    setSwapsByItem((prev) => ({
      ...prev,
      [itemId]: (prev[itemId] ?? []).map((s) => (s.key === key ? { ...s, ...patch } : s)),
    }));
  }

  function removeSwap(itemId: string, key: string) {
    setSwapsByItem((prev) => ({
      ...prev,
      [itemId]: (prev[itemId] ?? []).filter((s) => s.key !== key),
    }));
  }

  // Mapa de unidades disponibles en stock movil por producto (solo entera).
  const stockMovilByProduct = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of stockMovil) {
      map.set(s.product_id, Number(s.total_units));
    }
    return map;
  }, [stockMovil]);

  // Para mostrar el progreso por item: returned + swap = consumido del original.
  function getItemBreakdown(item: typeof items[number]) {
    const deliveredQty = delivered[item.id] ?? item.quantity;
    const returnedQty = item.quantity - deliveredQty;
    const swaps = swapsByItem[item.id] ?? [];
    const swappedQty = swaps.reduce(
      (acc, s) => acc + (Number.isFinite(s.swapped_quantity) ? s.swapped_quantity : 0),
      0
    );
    const originalDelivered = Math.max(0, deliveredQty - swappedQty);
    return { deliveredQty, returnedQty, swappedQty, originalDelivered };
  }

  // Total entregado: original a precio del item + swaps al precio original (1:1 quantity).
  // Pricing del swap = precio original. El cliente paga lo que pidio.
  const deliveredTotal = items.reduce((sum, item) => {
    const { deliveredQty } = getItemBreakdown(item);
    return sum + deliveredQty * item.unit_price;
  }, 0);

  const hasReturns = items.some((item) => getItemBreakdown(item).returnedQty > 0);

  function handleConfirm() {
    setError("");

    for (const item of items) {
      const { deliveredQty, swappedQty, originalDelivered } = getItemBreakdown(item);
      if (deliveredQty < 0 || deliveredQty > item.quantity) {
        setError(`Cantidad invalida para ${item.product?.name}`);
        return;
      }
      if (swappedQty > deliveredQty) {
        setError(
          `${item.product?.name}: los cambios (${swappedQty}) exceden lo entregado (${deliveredQty})`
        );
        return;
      }
      if (originalDelivered < 0) {
        setError(`${item.product?.name}: desbalance entre entregado y cambios`);
        return;
      }
    }

    const allSwaps: SwapDraft[] = Object.values(swapsByItem).flat();
    for (const s of allSwaps) {
      if (!s.swapped_product_id) {
        setError("Selecciona el producto de cada cambio en sitio");
        return;
      }
      if (!Number.isFinite(s.swapped_quantity) || s.swapped_quantity <= 0) {
        setError("Cada cambio debe tener cantidad mayor a 0");
        return;
      }
      const item = items.find((i) => i.id === s.order_item_id);
      if (item && s.swapped_product_id === item.product_id) {
        setError("El producto de cambio debe ser distinto al original");
        return;
      }
      const available = stockMovilByProduct.get(s.swapped_product_id) ?? 0;
      if (s.swapped_quantity > available) {
        setError(
          `Tu stock movil solo tiene ${available} unidades del producto seleccionado`
        );
        return;
      }
    }

    const returnedItems = items
      .map((item) => {
        const { returnedQty } = getItemBreakdown(item);
        return returnedQty > 0
          ? { order_item_id: item.id, returned_quantity: returnedQty }
          : null;
      })
      .filter((x): x is { order_item_id: string; returned_quantity: number } => x !== null);

    const swapsPayload: ConfirmDeliverySwapInput[] = allSwaps.map((s) => ({
      order_item_id: s.order_item_id,
      swapped_product_id: s.swapped_product_id,
      swapped_quantity: s.swapped_quantity,
      // MVP: siempre se descuenta del stock movil del courier. Si en el futuro
      // se quiere permitir descuento desde central, agregar toggle en la UI.
      source: "courier_kit",
    }));

    startTransition(async () => {
      const result = await confirmDelivery(
        order.id,
        returnedItems.length > 0 ? returnedItems : undefined,
        undefined,
        swapsPayload.length > 0 ? swapsPayload : undefined
      );

      if (result.success) {
        onDelivered(deliveredTotal);
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
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#1E293B]">Confirmar Entrega</DialogTitle>
          <DialogDescription>
            Indica cuantas unidades entregaste y registra cambios en sitio
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {items.map((item) => {
            const { deliveredQty, returnedQty, swappedQty, originalDelivered } =
              getItemBreakdown(item);
            const swaps = swapsByItem[item.id] ?? [];
            return (
              <div
                key={item.id}
                className="space-y-2 rounded-lg border border-slate-200 p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1E293B] truncate">
                      {item.product?.name || "Producto"}
                    </p>
                    <p className="text-xs text-[#64748B]">
                      Pedido: {item.quantity} — {formatCurrency(item.unit_price)} c/u
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-[#64748B]">Entregado:</label>
                    <Input
                      type="number"
                      min={0}
                      max={item.quantity}
                      value={deliveredQty}
                      onChange={(e) =>
                        updateDelivered(item.id, parseInt(e.target.value) || 0)
                      }
                      className="w-16 text-center"
                    />
                  </div>
                </div>

                {(returnedQty > 0 || swappedQty > 0) && (
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                    {originalDelivered > 0 && (
                      <span className="text-[#10B981]">
                        Original: {originalDelivered}
                      </span>
                    )}
                    {swappedQty > 0 && (
                      <span className="text-[#3B82F6]">Cambios: {swappedQty}</span>
                    )}
                    {returnedQty > 0 && (
                      <span className="text-[#EF4444]">Devuelto: {returnedQty}</span>
                    )}
                  </div>
                )}

                {swaps.length > 0 && (
                  <div className="space-y-2 rounded-md border border-slate-100 bg-slate-50 p-2">
                    {swaps.map((s) => {
                      const available = s.swapped_product_id
                        ? stockMovilByProduct.get(s.swapped_product_id) ?? 0
                        : 0;
                      return (
                        <div key={s.key} className="space-y-1">
                          <div className="flex items-center gap-2">
                            <select
                              value={s.swapped_product_id}
                              onChange={(e) =>
                                updateSwap(item.id, s.key, {
                                  swapped_product_id: e.target.value,
                                })
                              }
                              className="flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
                            >
                              <option value="">Producto sustituto…</option>
                              {stockMovil
                                .filter((sm) => sm.product_id !== item.product_id)
                                .map((sm) => (
                                  <option key={sm.product_id} value={sm.product_id}>
                                    {sm.product_name} ({sm.total_units} disp.)
                                  </option>
                                ))}
                            </select>
                            <Input
                              type="number"
                              min={1}
                              max={item.quantity - returnedQty}
                              value={s.swapped_quantity}
                              onChange={(e) =>
                                updateSwap(item.id, s.key, {
                                  swapped_quantity: parseInt(e.target.value) || 0,
                                })
                              }
                              className="w-14 text-center"
                            />
                            <button
                              type="button"
                              onClick={() => removeSwap(item.id, s.key)}
                              className="rounded-md p-1 text-[#64748B] hover:bg-red-50 hover:text-[#EF4444]"
                              aria-label="Quitar cambio"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          {s.swapped_product_id && s.swapped_quantity > available && (
                            <p className="text-xs text-[#EF4444]">
                              Solo tienes {available} en stock móvil
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {stockMovil.length > 0 && (
                  <button
                    type="button"
                    onClick={() => addSwap(item.id)}
                    className="flex items-center gap-1 text-xs text-[#3B82F6] hover:underline"
                  >
                    <Plus className="h-3 w-3" />
                    Cambio en sitio
                  </button>
                )}
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
            <span
              className={
                deliveredTotal < order.total ? "text-[#F59E0B]" : "text-[#10B981]"
              }
            >
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
