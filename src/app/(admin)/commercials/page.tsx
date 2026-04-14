import { listAllCommercials } from "@/actions/commercials";
import { CommercialsTable } from "@/components/admin/commercials/commercials-table";

export default async function CommercialsPage() {
  const commercialsResult = await listAllCommercials();
  const commercials = commercialsResult.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1E293B]">Comerciales</h2>
        <p className="text-sm text-[#64748B]">
          Gestion de vendedores comerciales y sus clientes asignados
        </p>
      </div>
      <CommercialsTable initialCommercials={commercials} />
    </div>
  );
}
