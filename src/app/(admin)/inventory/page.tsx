import { listExpiringLots, listLots, listProducts } from "@/actions/inventory";
import { listCustomers } from "@/actions/customers";
import { listCouriersWithInventory } from "@/actions/courier-warehouse";
import { InventoryTabs } from "@/components/admin/inventory/inventory-tabs";

export default async function InventoryPage() {
  const [productsResult, customersResult, lotsResult, expiringResult, couriersResult] =
    await Promise.all([
      listProducts(),
      listCustomers(),
      listLots({ status: "active", page: 1, page_size: 25, sort_field: "received_at", sort_dir: "desc" }),
      listExpiringLots(30),
      listCouriersWithInventory(),
    ]);

  const products = productsResult.data ?? [];
  const customers = customersResult.data ?? [];
  const initialLots = lotsResult.data ?? {
    lots: [],
    total: 0,
    page: 1,
    page_size: 25,
    total_pages: 0,
  };
  const expiringLots = expiringResult.data ?? [];
  const initialCouriersInventory = couriersResult.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1E293B]">Inventario</h2>
        <p className="text-sm text-[#64748B]">
          Productos, lotes y bodegas de couriers
        </p>
      </div>
      <InventoryTabs
        products={products}
        initialLots={initialLots}
        expiringLots={expiringLots}
        customers={customers}
        initialCouriersInventory={initialCouriersInventory}
      />
    </div>
  );
}
