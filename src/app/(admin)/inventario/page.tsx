import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function InventarioPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1E293B]">Inventario</h2>
        <p className="text-sm text-[#64748B]">
          Productos, stock y movimientos
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Productos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[#64748B]">
            Conecte la base de datos para ver los productos.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
