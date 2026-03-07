import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DeliveriesPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-[#1E293B]">Mis Entregas</h2>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Entregas Pendientes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[#64748B]">
            No tienes entregas asignadas por el momento.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
