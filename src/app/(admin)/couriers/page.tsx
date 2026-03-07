import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CouriersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1E293B]">Domiciliarios</h2>
        <p className="text-sm text-[#64748B]">
          Gestion de mensajeros y domiciliarios
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Listado de Domiciliarios</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[#64748B]">
            Modulo de domiciliarios en desarrollo.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
