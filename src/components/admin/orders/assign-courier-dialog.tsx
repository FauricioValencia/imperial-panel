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
import type { Order, User } from "@/types";

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
  const [isPending, startTransition] = useTransition();

  function handleAssign() {
    if (!order || !selectedCourier) return;
    setError("");

    startTransition(async () => {
      const result = await assignCourier(order.id, selectedCourier);
      if (!result.success) {
        setError(result.error || "Error assigning courier");
      } else {
        setSelectedCourier("");
        onClose();
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setSelectedCourier(""); setError(""); onClose(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#1E293B]">Asignar Domiciliario</DialogTitle>
          <DialogDescription>
            Pedido para <strong>{order?.customer?.name}</strong> — Total: {order ? new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(order.total) : ""}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-2">
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
            Al asignar, el stock se descontara automaticamente.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedCourier || isPending}
            className="bg-[#10B981] hover:bg-[#059669]"
          >
            {isPending ? "Asignando..." : "Asignar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
