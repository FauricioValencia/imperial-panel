import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RoutePage() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-[#1E293B]">Mi Ruta</h2>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ruta del Dia</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[#64748B]">
            No hay ruta asignada para hoy.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
