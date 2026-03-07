"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Truck, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AssignCourierDialog } from "./assign-courier-dialog";
import { markInTransit } from "@/actions/orders";
import type { Order, User } from "@/types";

interface OrderDetailActionsProps {
  order: Order;
  couriers: User[];
}

export function OrderDetailActions({ order, couriers }: OrderDetailActionsProps) {
  const router = useRouter();
  const [showAssign, setShowAssign] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleMarkInTransit() {
    setError("");
    startTransition(async () => {
      const result = await markInTransit(order.id);
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error || "Error al actualizar");
      }
    });
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {error && (
          <span className="text-sm text-[#EF4444]">{error}</span>
        )}
        {order.status === "pending" && (
          <Button
            onClick={() => setShowAssign(true)}
            className="bg-[#10B981] hover:bg-[#059669]"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Asignar
          </Button>
        )}
        {order.status === "assigned" && (
          <Button
            onClick={handleMarkInTransit}
            disabled={isPending}
            className="bg-[#F59E0B] hover:bg-[#D97706] text-white"
          >
            <Truck className="mr-2 h-4 w-4" />
            {isPending ? "Actualizando..." : "Marcar en camino"}
          </Button>
        )}
        {(order.status === "delivered" || order.status === "returned" || order.status === "partial") && (
          <div className="flex items-center gap-2 text-sm text-[#64748B]">
            <CheckCircle className="h-4 w-4 text-[#10B981]" />
            Pedido finalizado
          </div>
        )}
      </div>

      <AssignCourierDialog
        open={showAssign}
        onClose={() => setShowAssign(false)}
        order={order}
        couriers={couriers}
      />
    </>
  );
}
