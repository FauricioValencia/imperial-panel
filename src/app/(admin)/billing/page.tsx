import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1E293B]">Cartera</h2>
        <p className="text-sm text-[#64748B]">
          Cuentas por cobrar y pagos
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cuentas por Cobrar</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[#64748B]">
            Modulo de cartera en desarrollo.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
