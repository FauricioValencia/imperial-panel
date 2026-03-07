"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Phone, Package, Truck, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { markInTransit } from "@/actions/orders";
import { ConfirmDeliveryDialog } from "./confirm-delivery-dialog";
import type { Order } from "@/types";

const statusConfig: Record<string, { label: string; color: string }> = {
  assigned: { label: "Asignado", color: "bg-blue-100 text-blue-700" },
  in_transit: { label: "En camino", color: "bg-amber-100 text-amber-700" },
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(value);
}

interface DeliveryCardProps {
  order: Order;
  onDeliveryConfirmed: (deliveredTotal: number) => void;
}

export function DeliveryCard({ order, onDeliveryConfirmed }: DeliveryCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const config = statusConfig[order.status] || statusConfig.assigned;

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

  function handleDelivered(total: number) {
    setShowConfirm(false);
    onDeliveryConfirmed(total);
  }

  return (
    <>
      <Card className="border-slate-200">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-[#1E293B]">
                {order.customer?.name}
              </p>
              <p className="text-xs text-[#64748B] font-mono">
                #{order.id.slice(0, 8)}
              </p>
            </div>
            <Badge variant="secondary" className={config.color}>
              {config.label}
            </Badge>
          </div>

          {order.customer?.address && (
            <div className="flex items-start gap-2 text-sm text-[#64748B]">
              <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{order.customer.address}</span>
            </div>
          )}

          {order.customer?.phone && (
            <div className="flex items-center gap-2 text-sm text-[#64748B]">
              <Phone className="h-4 w-4 shrink-0" />
              <a href={`tel:${order.customer.phone}`} className="text-[#3B82F6]">
                {order.customer.phone}
              </a>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-[#64748B]">
            <Package className="h-4 w-4 shrink-0" />
            <span>{order.items?.length || 0} producto(s)</span>
            <span className="ml-auto font-semibold text-[#1E293B]">
              {formatCurrency(order.total)}
            </span>
          </div>

          {order.items && order.items.length > 0 && (
            <div className="border-t border-slate-100 pt-2 space-y-1">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-[#64748B]">
                    {item.quantity}x {item.product?.name || "Producto"}
                  </span>
                  <span className="text-[#1E293B]">
                    {formatCurrency(item.quantity * item.unit_price)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            {order.status === "assigned" && (
              <Button
                onClick={handleMarkInTransit}
                disabled={isPending}
                className="flex-1 bg-[#F59E0B] hover:bg-[#D97706] text-white min-h-[44px]"
              >
                <Truck className="mr-2 h-4 w-4" />
                {isPending ? "Actualizando..." : "En camino"}
              </Button>
            )}
            {order.status === "in_transit" && (
              <Button
                onClick={() => setShowConfirm(true)}
                disabled={isPending}
                className="flex-1 bg-[#10B981] hover:bg-[#059669] min-h-[44px]"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Confirmar entrega
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <ConfirmDeliveryDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onDelivered={handleDelivered}
        order={order}
      />
    </>
  );
}
