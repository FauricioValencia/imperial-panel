import { listMyHistory } from "@/actions/orders";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, CheckCircle, Undo2, AlertTriangle } from "lucide-react";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(value);
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  delivered: { label: "Entregado", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
  returned: { label: "Devuelto", color: "bg-red-100 text-red-700", icon: Undo2 },
  partial: { label: "Parcial", color: "bg-orange-100 text-orange-700", icon: AlertTriangle },
};

export default async function HistoryPage() {
  const result = await listMyHistory();
  const orders = result.data ?? [];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-[#1E293B]">Historial</h2>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Package className="h-12 w-12 text-[#64748B] mb-3" />
          <p className="text-sm text-[#64748B]">
            No hay entregas en el historial.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const config = statusConfig[order.status] || statusConfig.delivered;
            const StatusIcon = config.icon;
            return (
              <Card key={order.id} className="border-slate-200">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-[#1E293B]">
                        {order.customer?.name}
                      </p>
                      <p className="text-xs text-[#64748B]">
                        {order.delivered_at ? formatDate(order.delivered_at) : formatDate(order.created_at)}
                      </p>
                    </div>
                    <Badge variant="secondary" className={config.color}>
                      <StatusIcon className="mr-1 h-3 w-3" />
                      {config.label}
                    </Badge>
                  </div>

                  {order.items && order.items.length > 0 && (
                    <div className="border-t border-slate-100 pt-2 space-y-1">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-[#64748B]">
                            {item.quantity}x {item.product?.name || "Producto"}
                            {item.returned_quantity > 0 && (
                              <span className="text-[#EF4444] ml-1">
                                (-{item.returned_quantity} dev.)
                              </span>
                            )}
                          </span>
                          <span className="text-[#1E293B]">
                            {formatCurrency(item.quantity * item.unit_price)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                    <span className="text-xs text-[#64748B] font-mono">
                      #{order.id.slice(0, 8)}
                    </span>
                    <span className="font-semibold text-[#1E293B]">
                      {formatCurrency(order.total)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
