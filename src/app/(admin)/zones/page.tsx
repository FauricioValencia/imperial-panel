import { listZones } from "@/actions/zones";
import { ZonesTable } from "@/components/admin/zones/zones-table";

export default async function ZonesPage() {
  const result = await listZones();
  const zones = result.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1E293B]">Zonas</h2>
        <p className="text-sm text-[#64748B]">
          Gestión de zonas de reparto asignadas a domiciliarios
        </p>
      </div>
      <ZonesTable initialZones={zones} />
    </div>
  );
}
