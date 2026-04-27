import { listLots, listProducts } from "@/actions/inventory";
import { listCustomers } from "@/actions/customers";
import { InventoryTabs } from "@/components/admin/inventory/inventory-tabs";

export default async function InventoryPage() {
  const [productsResult, customersResult, lotsResult] = await Promise.all([
    listProducts(),
    listCustomers(),
    listLots(),
  ]);

  const products = productsResult.data ?? [];
  const customers = customersResult.data ?? [];
  const lots = lotsResult.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1E293B]">Inventario</h2>
        <p className="text-sm text-[#64748B]">
          Productos, lotes y movimientos
        </p>
      </div>
      <InventoryTabs products={products} lots={lots} customers={customers} />
    </div>
  );
}
