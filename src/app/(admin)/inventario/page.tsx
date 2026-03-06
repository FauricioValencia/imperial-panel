import { listarProductos } from "@/actions/inventario";
import { TablaProductos } from "@/components/admin/inventario/tabla-productos";

export default async function InventarioPage() {
  const resultado = await listarProductos();
  const productos = resultado.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1E293B]">Inventario</h2>
        <p className="text-sm text-[#64748B]">
          Productos, stock y movimientos
        </p>
      </div>
      <TablaProductos productosIniciales={productos} />
    </div>
  );
}
