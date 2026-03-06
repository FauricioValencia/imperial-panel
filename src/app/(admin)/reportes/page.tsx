import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ReportesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1E293B]">Reportes</h2>
        <p className="text-sm text-[#64748B]">
          Reportes y generacion de documentos
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Generador de Tickets de Cobro</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[#64748B]">
            Conecte la base de datos para generar reportes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
