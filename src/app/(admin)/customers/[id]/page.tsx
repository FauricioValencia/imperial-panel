import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCustomer } from "@/actions/customers";
import { listCustomerPrices } from "@/actions/customer-prices";
import { listProducts } from "@/actions/inventory";
import { getInventoryValuation } from "@/actions/lot-analytics";
import { CustomerAgreedPricesSection } from "@/components/admin/customers/customer-agreed-prices-section";
import { Button } from "@/components/ui/button";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [customerRes, pricesRes, productsRes, valuationRes] = await Promise.all([
    getCustomer(id),
    listCustomerPrices(id),
    listProducts(),
    getInventoryValuation(),
  ]);

  const inventoryCppByProductId: Record<string, number | null> = {};
  if (valuationRes.success && valuationRes.data) {
    for (const v of valuationRes.data) {
      inventoryCppByProductId[v.product_id] = v.weighted_avg_cost;
    }
  }

  if (!customerRes.success || !customerRes.data) {
    notFound();
  }

  const prices = pricesRes.success && pricesRes.data ? pricesRes.data : [];
  const products = productsRes.success && productsRes.data ? productsRes.data : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link href="/customers">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Clientes
          </Link>
        </Button>
      </div>
      <div>
        <h2 className="text-2xl font-bold text-[#1E293B]">{customerRes.data.name}</h2>
        <p className="text-sm text-[#64748B]">Precios acordados por producto (distintos al precio de lista)</p>
      </div>
      <CustomerAgreedPricesSection
        customerId={id}
        customerName={customerRes.data.name}
        initialPrices={prices}
        products={products}
        inventoryCppByProductId={inventoryCppByProductId}
      />
    </div>
  );
}
