import { listBillingCustomers } from "@/actions/billing";
import { BillingTable } from "@/components/admin/billing/billing-table";

export default async function BillingPage() {
  const result = await listBillingCustomers();
  const customers = result.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1E293B]">Cartera</h2>
        <p className="text-sm text-[#64748B]">
          Cuentas por cobrar y registro de pagos
        </p>
      </div>
      <BillingTable customers={customers} />
    </div>
  );
}
