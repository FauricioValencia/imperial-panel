import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ClientesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1E293B]">Clientes</h2>
        <p className="text-sm text-[#64748B]">
          Gestion de clientes y sus datos
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Listado de Clientes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[#64748B]">
            Conecte la base de datos para ver los clientes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
