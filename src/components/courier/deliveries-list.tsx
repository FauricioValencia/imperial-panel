"use client";

import { useState } from "react";
import { Package } from "lucide-react";
import { DeliveryCard } from "./delivery-card";
import { CourierPaymentDialog } from "./courier-payment-dialog";
import type { Order } from "@/types";

interface DeliveriesListProps {
  orders: Order[];
}

export function DeliveriesList({ orders }: DeliveriesListProps) {
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null);
  const [deliveredTotal, setDeliveredTotal] = useState(0);

  const assigned = orders.filter((o) => o.status === "assigned");
  const inTransit = orders.filter((o) => o.status === "in_transit");

  function handleDeliveryConfirmed(order: Order, total: number) {
    setPaymentOrder(order);
    setDeliveredTotal(total);
  }

  return (
    <>
      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Package className="h-12 w-12 text-[#64748B] mb-3" />
          <p className="text-sm text-[#64748B]">
            No tienes entregas asignadas por el momento.
          </p>
        </div>
      ) : (
        <>
          {inTransit.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[#F59E0B] uppercase tracking-wide">
                En camino ({inTransit.length})
              </h3>
              {inTransit.map((order) => (
                <DeliveryCard
                  key={order.id}
                  order={order}
                  onDeliveryConfirmed={(total) => handleDeliveryConfirmed(order, total)}
                />
              ))}
            </div>
          )}

          {assigned.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[#3B82F6] uppercase tracking-wide">
                Asignados ({assigned.length})
              </h3>
              {assigned.map((order) => (
                <DeliveryCard
                  key={order.id}
                  order={order}
                  onDeliveryConfirmed={(total) => handleDeliveryConfirmed(order, total)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Payment dialog lives here at list level — survives card unmounting */}
      {paymentOrder && (
        <CourierPaymentDialog
          open={!!paymentOrder}
          onClose={() => setPaymentOrder(null)}
          order={paymentOrder}
          deliveredTotal={deliveredTotal}
        />
      )}
    </>
  );
}
