import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Package, Phone, Truck } from "lucide-react";
import {
  getCourierDetail,
  getCourierActiveRoute,
  getCourierHistory,
} from "@/actions/couriers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";

const statusConfig: Record<string, { label: string; color: string }> = {
  assigned: { label: "Asignado", color: "bg-blue-100 text-blue-700" },
  in_transit: { label: "En camino", color: "bg-amber-100 text-amber-700" },
  delivered: { label: "Entregado", color: "bg-emerald-100 text-emerald-700" },
  returned: { label: "Devuelto", color: "bg-red-100 text-red-700" },
  partial: { label: "Parcial", color: "bg-orange-100 text-orange-700" },
};

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function formatDateLong(date: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export default async function CourierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [courierResult, activeResult, historyResult] = await Promise.all([
    getCourierDetail(id),
    getCourierActiveRoute(id),
    getCourierHistory(id),
  ]);

  if (!courierResult.success || !courierResult.data) {
    notFound();
  }

  const courier = courierResult.data;
  const activeOrders = activeResult.data ?? [];
  const historyOrders = historyResult.data ?? [];

  const totalDelivered = historyOrders.filter((o) => o.status === "delivered").length;
  const totalPartial = historyOrders.filter((o) => o.status === "partial").length;
  const totalReturned = historyOrders.filter((o) => o.status === "returned").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/couriers"
          className="rounded-md p-1.5 text-[#64748B] hover:bg-slate-100 hover:text-[#1E293B]"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-[#1E293B]">
              {courier.name}
            </h2>
            {courier.active ? (
              <Badge className="bg-[#10B981] text-white hover:bg-[#10B981]">
                Activo
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-slate-100 text-slate-500">
                Inactivo
              </Badge>
            )}
          </div>
          <p className="text-sm text-[#64748B]">{courier.email}</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-[#64748B]">En ruta ahora</p>
            <p className="text-2xl font-bold text-[#3B82F6]">
              {activeOrders.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-[#64748B]">Entregados</p>
            <p className="text-2xl font-bold text-[#10B981]">
              {totalDelivered}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-[#64748B]">Parciales</p>
            <p className="text-2xl font-bold text-[#F59E0B]">
              {totalPartial}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-[#64748B]">Devueltos</p>
            <p className="text-2xl font-bold text-[#EF4444]">
              {totalReturned}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active route */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-[#1E293B]">
            <Truck className="h-5 w-5 text-[#3B82F6]" />
            Ruta Actual ({activeOrders.length} pedido{activeOrders.length !== 1 ? "s" : ""})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeOrders.length === 0 ? (
            <p className="py-4 text-center text-sm text-[#64748B]">
              Sin entregas activas en este momento
            </p>
          ) : (
            <div className="space-y-3">
              {activeOrders.map((order, index) => {
                const config = statusConfig[order.status] || statusConfig.assigned;
                return (
                  <div
                    key={order.id}
                    className="flex items-start gap-3 rounded-lg border border-slate-200 p-3"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1E3A5F] text-xs font-bold text-white">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <Link
                          href={`/orders/${order.id}`}
                          className="font-medium text-[#1E293B] hover:text-[#3B82F6]"
                        >
                          {order.customer?.name}
                        </Link>
                        <Badge variant="secondary" className={config.color}>
                          {config.label}
                        </Badge>
                      </div>
                      {order.customer?.address && (
                        <div className="flex items-start gap-1.5 text-xs text-[#64748B]">
                          <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                          <span>{order.customer.address}</span>
                        </div>
                      )}
                      {order.customer?.phone && (
                        <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
                          <Phone className="h-3.5 w-3.5 shrink-0" />
                          <span>{order.customer.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
                        <Package className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          {order.items?.length || 0} producto(s) —{" "}
                          <span className="font-semibold text-[#1E293B]">
                            {formatCurrency(order.total)}
                          </span>
                        </span>
                      </div>
                      {order.items && order.items.length > 0 && (
                        <div className="mt-1 space-y-0.5 border-t border-slate-100 pt-1">
                          {order.items.map((item) => (
                            <div key={item.id} className="text-xs text-[#64748B]">
                              {item.quantity}x {item.product?.name || "Producto"}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delivery history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-[#1E293B]">
            Historial de Entregas (ultimos 50)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {historyOrders.length === 0 ? (
            <p className="py-4 text-center text-sm text-[#64748B]">
              Sin entregas completadas aun
            </p>
          ) : (
            <div className="rounded-lg border border-slate-200">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Entregado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyOrders.map((order) => {
                    const config = statusConfig[order.status] || statusConfig.delivered;
                    return (
                      <TableRow key={order.id}>
                        <TableCell>
                          <Link
                            href={`/orders/${order.id}`}
                            className="font-mono text-xs text-[#3B82F6] hover:underline"
                          >
                            #{order.id.slice(0, 8)}
                          </Link>
                        </TableCell>
                        <TableCell className="font-medium text-[#1E293B]">
                          {order.customer?.name}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className={config.color}>
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(order.total)}
                        </TableCell>
                        <TableCell className="text-sm text-[#64748B]">
                          {order.delivered_at
                            ? formatDate(order.delivered_at)
                            : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
