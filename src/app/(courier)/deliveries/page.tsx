import { listMyDeliveries } from "@/actions/orders";
import { DeliveriesList } from "@/components/courier/deliveries-list";

export default async function DeliveriesPage() {
  const result = await listMyDeliveries();
  const orders = result.data ?? [];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-[#1E293B]">Mis Entregas</h2>
      <DeliveriesList orders={orders} />
    </div>
  );
}
