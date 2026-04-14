import { listAllCouriers } from "@/actions/couriers";
import { listProducts } from "@/actions/inventory";
import { SalesReport } from "@/components/admin/reports/sales-report";
import { OutboundReport } from "@/components/admin/reports/outbound-report";

export default async function ReportsPage() {
  const [couriersResult, productsResult] = await Promise.all([
    listAllCouriers(),
    listProducts(),
  ]);

  const couriers = couriersResult.data ?? [];
  const products = productsResult.data ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-[#1E293B]">Reportes</h2>
        <p className="text-sm text-[#64748B]">
          Estadísticas de ventas y entregas
        </p>
      </div>
      <SalesReport couriers={couriers} products={products} />
      <OutboundReport />
    </div>
  );
}
