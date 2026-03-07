import { listMyDeliveries } from "@/actions/orders";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Navigation } from "lucide-react";

const statusConfig: Record<string, { label: string; color: string }> = {
  assigned: { label: "Asignado", color: "bg-blue-100 text-blue-700" },
  in_transit: { label: "En camino", color: "bg-amber-100 text-amber-700" },
};

export default async function RoutePage() {
  const result = await listMyDeliveries();
  const orders = result.data ?? [];

  // Sort: in_transit first, then assigned
  const sorted = [...orders].sort((a, b) => {
    if (a.status === "in_transit" && b.status !== "in_transit") return -1;
    if (b.status === "in_transit" && a.status !== "in_transit") return 1;
    return 0;
  });

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-[#1E293B]">Mi Ruta</h2>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Navigation className="h-12 w-12 text-[#64748B] mb-3" />
          <p className="text-sm text-[#64748B]">
            No hay entregas asignadas para hoy.
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-[#64748B]">
            {sorted.length} entrega{sorted.length !== 1 ? "s" : ""} pendiente{sorted.length !== 1 ? "s" : ""}
          </p>
          <div className="space-y-3">
            {sorted.map((order, index) => {
              const config = statusConfig[order.status] || statusConfig.assigned;
              const address = order.customer?.address || "";
              const mapsUrl = address
                ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
                : null;

              return (
                <Card key={order.id} className="border-slate-200">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1E3A5F] text-xs font-bold text-white">
                          {index + 1}
                        </span>
                        <p className="font-semibold text-[#1E293B]">
                          {order.customer?.name}
                        </p>
                      </div>
                      <Badge variant="secondary" className={config.color}>
                        {config.label}
                      </Badge>
                    </div>

                    {address && (
                      <div className="flex items-start gap-2 text-sm text-[#64748B]">
                        <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                        <span>{address}</span>
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      {order.customer?.phone && (
                        <a
                          href={`tel:${order.customer.phone}`}
                          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-[#3B82F6] hover:bg-slate-50 min-h-[44px]"
                        >
                          <Phone className="h-4 w-4" />
                          Llamar
                        </a>
                      )}
                      {mapsUrl && (
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-[#10B981] hover:bg-slate-50 min-h-[44px]"
                        >
                          <Navigation className="h-4 w-4" />
                          Navegar
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
