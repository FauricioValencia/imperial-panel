import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DomiciliariosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1E293B]">Domiciliarios</h2>
        <p className="text-sm text-[#64748B]">
          Gestion de mensajeros y cierres de caja
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mensajeros Activos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[#64748B]">
            Conecte la base de datos para ver los domiciliarios.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
