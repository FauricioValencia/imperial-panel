import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1E293B]">Reportes</h2>
        <p className="text-sm text-[#64748B]">
          Reportes y estadisticas del negocio
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reportes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[#64748B]">
            Modulo de reportes en desarrollo.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
