import {
  getMyInventory,
  listMyInventoryMovements,
} from "@/actions/courier-warehouse";
import { CourierWarehouseTabs } from "@/components/courier/courier-warehouse-tabs";

export default async function CourierWarehousePage() {
  const [inventoryResult, movementsResult] = await Promise.all([
    getMyInventory(),
    listMyInventoryMovements(),
  ]);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-[#1E293B]">Mi Bodega</h2>
      <CourierWarehouseTabs
        initialInventory={inventoryResult.data ?? []}
        initialMovements={movementsResult.data ?? []}
      />
    </div>
  );
}
