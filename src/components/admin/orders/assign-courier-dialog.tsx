"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
import { assignCourier } from "@/actions/orders";
import { formatCurrency } from "@/lib/format";
import type { CourierStockShortage, Order, User } from "@/types";

interface AssignCourierDialogProps {
  open: boolean;
  onClose: () => void;
  order: Order | null;
  couriers: User[];
}

export function AssignCourierDialog({
  open,
  onClose,
  order,
  couriers,
}: AssignCourierDialogProps) {
  const router = useRouter();
  const [selectedCourier, setSelectedCourier] = useState("");
  const [error, setError] = useState("");
  const [shortages, setShortages] = useState<CourierStockShortage[]>([]);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setSelectedCourier("");
    setError("");
    setShortages([]);
  }

  function handleAssign() {
    if (!order || !selectedCourier) return;
    setError("");
    setShortages([]);

    startTransition(async () => {
      const result = await assignCourier(order.id, selectedCourier);
      if (!result.success) {
        setError(result.error || "Error assigning courier");
        setShortages(result.data?.shortages ?? []);
      } else {
        reset();
        onClose();
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="min-w-0">
          <DialogTitle className="text-[#1E293B]">Asignar Domiciliario</DialogTitle>
          <DialogDescription className="wrap-break-word text-left">
            Pedido para <strong>{order?.customer?.name}</strong> — Total:{" "}
            {order ? formatCurrency(order.total) : ""}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <p>{error}</p>
            {shortages.length > 0 && (
              <div className="overflow-hidden rounded-md border border-red-200 bg-white">
                <table className="w-full text-xs">
                  <thead className="bg-red-100 text-red-900">
                    <tr>
                      <th className="px-2 py-1 text-left font-medium">Producto</th>
                      <th className="px-2 py-1 text-right font-medium">Necesita</th>
                      <th className="px-2 py-1 text-right font-medium">Disponible</th>
                      <th className="px-2 py-1 text-right font-medium">Falta</th>
                    </tr>
                  </thead>
                  <tbody className="text-[#1E293B]">
                    {shortages.map((s) => (
                      <tr key={s.product_id} className="border-t border-red-100">
                        <td className="px-2 py-1">{s.product_name}</td>
                        <td className="px-2 py-1 text-right">{s.required}</td>
                        <td className="px-2 py-1 text-right">{s.available}</td>
                        <td className="px-2 py-1 text-right font-semibold text-red-600">
                          {s.shortfall}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <div className="min-w-0 space-y-2">
          <label className="text-sm font-medium text-[#1E293B]">
            Seleccionar domiciliario
          </label>
          <Select value={selectedCourier} onValueChange={setSelectedCourier}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar..." />
            </SelectTrigger>
            <SelectContent>
              {couriers.length === 0 ? (
                <SelectItem value="_none" disabled>
                  No hay domiciliarios activos
                </SelectItem>
              ) : (
                couriers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} ({c.email})
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <p className="text-xs text-[#64748B]">
            El stock se descontara cuando el courier confirme la entrega.
          </p>
        </div>

        <DialogFooter className="sm:gap-2">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={onClose}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedCourier || isPending}
            className="w-full bg-[#10B981] hover:bg-[#059669] sm:w-auto"
          >
            {isPending ? "Asignando..." : "Asignar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
