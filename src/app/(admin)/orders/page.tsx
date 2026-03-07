import { listOrders, listCouriers } from "@/actions/orders";
import { OrdersTable } from "@/components/admin/orders/orders-table";

export default async function OrdersPage() {
  const [ordersResult, couriersResult] = await Promise.all([
    listOrders(),
    listCouriers(),
  ]);

  const orders = ordersResult.data ?? [];
  const couriers = couriersResult.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1E293B]">Pedidos</h2>
        <p className="text-sm text-[#64748B]">
          Gestion de pedidos y entregas
        </p>
      </div>
      <OrdersTable initialOrders={orders} couriers={couriers} />
    </div>
  );
}
