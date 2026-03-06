import { Card, CardContent } from "@/components/ui/card";
import { MapPin } from "lucide-react";

export default function RutaPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-[#1E293B]">Mi Ruta</h2>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="mb-4 rounded-full bg-slate-100 p-4">
            <MapPin className="h-8 w-8 text-[#64748B]" />
          </div>
          <p className="text-sm font-medium text-[#1E293B]">
            Sin ruta asignada
          </p>
          <p className="mt-1 text-xs text-[#64748B]">
            La ruta del dia aparecera aqui
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
