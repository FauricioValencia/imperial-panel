import { Card, CardContent } from "@/components/ui/card";
import { Clock } from "lucide-react";

export default function HistorialPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-[#1E293B]">Historial</h2>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="mb-4 rounded-full bg-slate-100 p-4">
            <Clock className="h-8 w-8 text-[#64748B]" />
          </div>
          <p className="text-sm font-medium text-[#1E293B]">
            Sin entregas registradas
          </p>
          <p className="mt-1 text-xs text-[#64748B]">
            El historial de entregas aparecera aqui
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
