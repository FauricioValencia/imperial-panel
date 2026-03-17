import { listAllCouriers } from "@/actions/couriers";
import { listZones } from "@/actions/zones";
import { CouriersTable } from "@/components/admin/couriers/couriers-table";

export default async function CouriersPage() {
  const [couriersResult, zonesResult] = await Promise.all([
    listAllCouriers(),
    listZones(),
  ]);

  const couriers = couriersResult.data ?? [];
  const zones = zonesResult.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1E293B]">Domiciliarios</h2>
        <p className="text-sm text-[#64748B]">
          Gestion de mensajeros y domiciliarios
        </p>
      </div>
      <CouriersTable initialCouriers={couriers} zones={zones} />
    </div>
  );
}
