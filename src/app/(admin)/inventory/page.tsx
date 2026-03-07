import { listProducts } from "@/actions/inventory";
import { ProductsTable } from "@/components/admin/inventory/products-table";

export default async function InventoryPage() {
  const result = await listProducts();
  const products = result.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1E293B]">Inventario</h2>
        <p className="text-sm text-[#64748B]">
          Productos, stock y movimientos
        </p>
      </div>
      <ProductsTable initialProducts={products} />
    </div>
  );
}
