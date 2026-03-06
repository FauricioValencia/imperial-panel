import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CarteraPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1E293B]">Cartera</h2>
        <p className="text-sm text-[#64748B]">
          Cuentas por cobrar y saldos pendientes
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Clientes con Saldo Pendiente</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[#64748B]">
            Conecte la base de datos para ver la cartera.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
