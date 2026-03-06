import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Wallet, Bike, AlertTriangle } from "lucide-react";

export default function DashboardPage() {
  // TODO: Reemplazar con datos reales de Supabase
  const metricas = [
    {
      titulo: "Pedidos Hoy",
      valor: "—",
      icono: Package,
      color: "text-[#3B82F6]",
      bg: "bg-blue-50",
    },
    {
      titulo: "Cartera Pendiente",
      valor: "—",
      icono: Wallet,
      color: "text-[#F59E0B]",
      bg: "bg-amber-50",
    },
    {
      titulo: "Mensajeros Activos",
      valor: "—",
      icono: Bike,
      color: "text-[#10B981]",
      bg: "bg-emerald-50",
    },
    {
      titulo: "Stock Bajo",
      valor: "—",
      icono: AlertTriangle,
      color: "text-[#EF4444]",
      bg: "bg-red-50",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1E293B]">Dashboard</h2>
        <p className="text-sm text-[#64748B]">
          Resumen general del negocio
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metricas.map((metrica) => (
          <Card key={metrica.titulo}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-[#64748B]">
                {metrica.titulo}
              </CardTitle>
              <div className={`rounded-lg p-2 ${metrica.bg}`}>
                <metrica.icono className={`h-4 w-4 ${metrica.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-[#1E293B]">
                {metrica.valor}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-[#1E293B]">
              Ultimos Pedidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[#64748B]">
              Los pedidos apareceran aqui cuando se conecte la base de datos.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base text-[#1E293B]">
              Clientes con Mayor Saldo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[#64748B]">
              La cartera pendiente aparecera aqui cuando se conecte la base de datos.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
