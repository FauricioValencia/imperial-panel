import { listCustomers } from "@/actions/customers";
import { listProducts } from "@/actions/inventory";
import { CreateOrderForm } from "@/components/admin/orders/create-order-form";

export default async function NewOrderPage() {
  const [customersResult, productsResult] = await Promise.all([
    listCustomers(),
    listProducts(),
  ]);

  const customers = customersResult.data ?? [];
  const products = productsResult.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1E293B]">Nuevo Pedido</h2>
        <p className="text-sm text-[#64748B]">
          Crear un nuevo pedido seleccionando cliente y productos
        </p>
      </div>
      <CreateOrderForm customers={customers} products={products} />
    </div>
  );
}
