import { Card, CardContent } from "@/components/ui/card";
import { Package } from "lucide-react";

export default function EntregasPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#1E293B]">Entregas del Dia</h2>
        <span className="rounded-full bg-[#1E3A5F] px-3 py-1 text-xs font-medium text-white">
          0 pendientes
        </span>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="mb-4 rounded-full bg-slate-100 p-4">
            <Package className="h-8 w-8 text-[#64748B]" />
          </div>
          <p className="text-sm font-medium text-[#1E293B]">
            Sin entregas pendientes
          </p>
          <p className="mt-1 text-xs text-[#64748B]">
            Las entregas asignadas apareceran aqui
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
