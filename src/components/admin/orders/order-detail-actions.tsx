"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Truck, CheckCircle, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AssignCourierDialog } from "./assign-courier-dialog";
import { CancelOrderDialog } from "./cancel-order-dialog";
import { markInTransit } from "@/actions/orders";
import type { Order, User } from "@/types";

interface OrderDetailActionsProps {
  order: Order;
  couriers: User[];
}

export function OrderDetailActions({ order, couriers }: OrderDetailActionsProps) {
  const { refresh } = useRouter();
  const [showAssign, setShowAssign] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const isCancelled = order.status === "cancelled";

  function handleMarkInTransit() {
    setError("");
    startTransition(async () => {
      const result = await markInTransit(order.id);
      if (result.success) {
        refresh();
      } else {
        setError(result.error || "Error al actualizar");
      }
    });
  }

  return (
    <>
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end lg:w-auto">
        {error && (
          <span className="text-sm text-[#EF4444] sm:w-full sm:text-right">
            {error}
          </span>
        )}
        {!isCancelled && order.status === "pending" && (
          <Button
            onClick={() => setShowAssign(true)}
            className="w-full bg-[#10B981] shadow-sm hover:bg-[#059669] sm:w-auto"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Asignar
          </Button>
        )}
        {!isCancelled && order.status === "assigned" && (
          <Button
            onClick={handleMarkInTransit}
            disabled={isPending}
            className="w-full bg-[#F59E0B] text-white shadow-sm hover:bg-[#D97706] sm:w-auto"
          >
            <Truck className="mr-2 h-4 w-4" />
            {isPending ? "Actualizando..." : "Marcar en camino"}
          </Button>
        )}
        {isCancelled && (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm text-[#64748B] sm:justify-start">
            <Ban className="h-4 w-4 text-[#64748B]" />
            Pedido cancelado
          </div>
        )}
        {(order.status === "delivered" || order.status === "returned" || order.status === "partial") &&
          !isCancelled && (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-[#047857] sm:justify-start">
            <CheckCircle className="h-4 w-4 text-[#10B981]" />
            Pedido finalizado
          </div>
        )}
        {!isCancelled && (
          <Button
            type="button"
            variant="outline"
            className="w-full border-[#EF4444] bg-white text-[#EF4444] shadow-sm hover:bg-red-50 sm:w-auto"
            onClick={() => setShowCancel(true)}
          >
            <Ban className="mr-2 h-4 w-4" />
            Cancelar pedido
          </Button>
        )}
      </div>

      <AssignCourierDialog
        open={showAssign}
        onClose={() => setShowAssign(false)}
        order={order}
        couriers={couriers}
      />
      <CancelOrderDialog
        open={showCancel}
        onClose={() => setShowCancel(false)}
        orderId={order.id}
        orderLabel={`Pedido #${order.id.slice(0, 8)}`}
        onSuccess={refresh}
      />
    </>
  );
}
