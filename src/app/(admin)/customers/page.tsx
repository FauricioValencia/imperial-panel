import { listCustomers } from "@/actions/customers";
import { listAllCouriers } from "@/actions/couriers";
import { listAllCommercials } from "@/actions/commercials";
import { CustomersTable } from "@/components/admin/customers/customers-table";

export default async function CustomersPage() {
  const [customersResult, couriersResult, commercialsResult] = await Promise.all([
    listCustomers(),
    listAllCouriers(),
    listAllCommercials(),
  ]);

  const customers = customersResult.data ?? [];
  const couriers = (couriersResult.data ?? []).filter((c) => c.active);
  const commercials = (commercialsResult.data ?? []).filter((c) => c.active);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1E293B]">Clientes</h2>
        <p className="text-sm text-[#64748B]">
          Gestion de clientes y sus datos
        </p>
      </div>
      <CustomersTable
        initialCustomers={customers}
        couriers={couriers}
        commercials={commercials}
      />
    </div>
  );
}
