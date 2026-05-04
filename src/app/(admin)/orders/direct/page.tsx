import { listCustomers } from "@/actions/customers";
import { listProductsForDirectSale } from "@/actions/direct-sale";
import { CreateDirectSaleForm } from "@/components/admin/orders/create-direct-sale-form";

export default async function DirectSalePage() {
  const [customersResult, productsResult] = await Promise.all([
    listCustomers(),
    listProductsForDirectSale(),
  ]);

  const customers = customersResult.data ?? [];
  const products = productsResult.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1E293B]">Venta directa</h2>
        <p className="text-sm text-[#64748B]">
          Registra una venta en mostrador: descuenta stock de bodega central y deja el pedido
          entregado. Opcionalmente registra pago al contado o deja el total en cartera.
        </p>
      </div>
      <CreateDirectSaleForm customers={customers} products={products} />
    </div>
  );
}
