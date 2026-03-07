import { listCustomers } from "@/actions/customers";
import { CustomersTable } from "@/components/admin/customers/customers-table";

export default async function CustomersPage() {
  const result = await listCustomers();
  const customers = result.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1E293B]">Clientes</h2>
        <p className="text-sm text-[#64748B]">
          Gestion de clientes y sus datos
        </p>
      </div>
      <CustomersTable initialCustomers={customers} />
    </div>
  );
}
