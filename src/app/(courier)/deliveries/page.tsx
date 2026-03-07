import { listMyDeliveries } from "@/actions/orders";
import { DeliveryCard } from "@/components/courier/delivery-card";
import { Package } from "lucide-react";

export default async function DeliveriesPage() {
  const result = await listMyDeliveries();
  const orders = result.data ?? [];

  const assigned = orders.filter((o) => o.status === "assigned");
  const inTransit = orders.filter((o) => o.status === "in_transit");

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-[#1E293B]">Mis Entregas</h2>

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
                <DeliveryCard key={order.id} order={order} />
              ))}
            </div>
          )}

          {assigned.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[#3B82F6] uppercase tracking-wide">
                Asignados ({assigned.length})
              </h3>
              {assigned.map((order) => (
                <DeliveryCard key={order.id} order={order} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
