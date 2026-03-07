import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCustomerBilling } from "@/actions/billing";
import { CustomerBillingDetail } from "@/components/admin/billing/customer-billing-detail";

export default async function CustomerBillingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getCustomerBilling(id);

  if (!result.success || !result.data) {
    notFound();
  }

  const { customer, orders, payments, total_billed, total_paid } = result.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/billing"
          className="rounded-md p-1.5 text-[#64748B] hover:bg-slate-100 hover:text-[#1E293B]"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-[#1E293B]">{customer.name}</h2>
          <p className="text-sm text-[#64748B]">
            {customer.phone && `${customer.phone} — `}
            {customer.address || "Sin direccion"}
          </p>
        </div>
      </div>

      <CustomerBillingDetail
        customer={customer}
        orders={orders}
        payments={payments}
        totalBilled={total_billed}
        totalPaid={total_paid}
      />
    </div>
  );
}
