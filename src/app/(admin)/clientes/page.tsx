import { listarClientes } from "@/actions/clientes";
import { TablaClientes } from "@/components/admin/clientes/tabla-clientes";

export default async function ClientesPage() {
  const resultado = await listarClientes();
  const clientes = resultado.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1E293B]">Clientes</h2>
        <p className="text-sm text-[#64748B]">
          Gestion de clientes y sus datos
        </p>
      </div>
      <TablaClientes clientesIniciales={clientes} />
    </div>
  );
}
