import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarClock,
  MapPin,
  PackageCheck,
  ReceiptText,
  Store,
  Truck,
  UserRound,
} from "lucide-react";
import { getOrder, listCouriers } from "@/actions/orders";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OrderDetailActions } from "@/components/admin/orders/order-detail-actions";
import { OrderDetailItems } from "@/components/admin/orders/order-detail-items";
import { formatCurrency } from "@/lib/format";

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendiente", color: "bg-slate-100 text-slate-700" },
  assigned: { label: "Asignado", color: "bg-blue-100 text-blue-700" },
  in_transit: { label: "En camino", color: "bg-amber-100 text-amber-700" },
  delivered: { label: "Entregado", color: "bg-emerald-100 text-emerald-700" },
  returned: { label: "Devuelto", color: "bg-red-100 text-red-700" },
  partial: { label: "Parcial", color: "bg-orange-100 text-orange-700" },
  cancelled: { label: "Cancelado", color: "bg-zinc-200 text-zinc-800" },
};

const orderDateFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatDate(date: string): string {
  return orderDateFormatter.format(new Date(date));
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [orderResult, couriersResult] = await Promise.all([
    getOrder(id),
    listCouriers(),
  ]);

  if (!orderResult.success || !orderResult.data) {
    notFound();
  }

  const order = orderResult.data;
  const couriers = couriersResult.data ?? [];
  const config = statusConfig[order.status] || statusConfig.pending;
  const esVentaDirecta = order.order_type === "direct";

  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-linear-to-br from-[#F8FAFC] via-white to-blue-50/70 p-4 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 gap-3">
              <Link
                href="/orders"
                className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-[#64748B] shadow-sm transition hover:border-[#3B82F6]/40 hover:text-[#1E3A5F]"
                aria-label="Volver a pedidos"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#64748B]">
                    Detalle de pedido
                  </span>
                  <Badge variant="secondary" className={config.color}>
                    {config.label}
                  </Badge>
                </div>
                <h1 className="wrap-break-word text-2xl font-bold tracking-tight text-[#1E293B] sm:text-3xl">
                  Pedido #{order.id.slice(0, 8)}
                </h1>
                <p className="flex items-start gap-2 text-sm leading-relaxed text-[#64748B]">
                  <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span>Creado el {formatDate(order.created_at)}</span>
                </p>
              </div>
            </div>

            <div className="flex w-full flex-col gap-3 lg:w-auto lg:min-w-[280px]">
              <div className="rounded-2xl bg-[#1E3A5F] p-4 text-white shadow-sm">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-blue-100">
                  Total del pedido
                </p>
                <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight">
                  {formatCurrency(order.total)}
                </p>
                {order.delivered_at && (
                  <p className="mt-2 text-xs text-blue-100">
                    Entregado: {formatDate(order.delivered_at)}
                  </p>
                )}
              </div>
              <OrderDetailActions order={order} couriers={couriers} />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="gap-4 border-slate-200 shadow-sm">
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#1E3A5F]">
              <UserRound className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <CardTitle className="text-sm text-[#64748B]">Cliente</CardTitle>
              <CardDescription>Datos principales del destinatario</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-base font-semibold text-[#1E293B]">
              {order.customer?.name}
            </p>
            {order.customer?.phone && (
              <p className="text-sm text-[#64748B]">{order.customer.phone}</p>
            )}
            {order.customer?.address && (
              <p className="flex items-start gap-2 text-sm leading-relaxed text-[#64748B]">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>{order.customer.address}</span>
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="gap-4 border-slate-200 shadow-sm">
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-[#059669]">
              {esVentaDirecta ? (
                <Store className="h-5 w-5" aria-hidden />
              ) : (
                <Truck className="h-5 w-5" aria-hidden />
              )}
            </div>
            <div>
              <CardTitle className="text-sm text-[#64748B]">
                {esVentaDirecta ? "Tipo de venta" : "Domiciliario"}
              </CardTitle>
              <CardDescription>
                {esVentaDirecta ? "Movimiento registrado en mostrador" : "Asignación de entrega"}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {esVentaDirecta ? (
              <div className="space-y-2">
                <Badge variant="outline" className="border-[#10B981] bg-emerald-50 text-[#059669]">
                  Venta directa (mostrador)
                </Badge>
                <p className="text-sm leading-relaxed text-[#64748B]">
                  Stock descontado de bodega central al registrar la venta.
                </p>
              </div>
            ) : order.courier ? (
              <div className="space-y-1">
                <p className="text-base font-semibold text-[#1E293B]">
                  {order.courier.name}
                </p>
                <p className="text-sm text-[#64748B]">{order.courier.email}</p>
                {order.assigned_at && (
                  <p className="mt-1 text-xs text-[#64748B]">
                    Asignado: {formatDate(order.assigned_at)}
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-sm font-medium text-[#1E293B]">Sin asignar</p>
                <p className="mt-1 text-xs text-[#64748B]">
                  El pedido todavía no tiene domiciliario.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-[#1E3A5F]">
              <PackageCheck className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <CardTitle className="text-base text-[#1E293B]">
                Productos del pedido
              </CardTitle>
              <CardDescription>
                {order.items?.length ?? 0} producto
                {(order.items?.length ?? 0) === 1 ? "" : "s"} registrado
                {(order.items?.length ?? 0) === 1 ? "" : "s"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          <OrderDetailItems items={order.items ?? []} />
        </CardContent>
      </Card>

      {order.notes && (
        <Card className="gap-4 border-slate-200 shadow-sm">
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-[#D97706]">
              <ReceiptText className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <CardTitle className="text-base text-[#1E293B]">Notas</CardTitle>
              <CardDescription>Observaciones internas del pedido</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <p className="rounded-2xl bg-[#F8FAFC] px-4 py-3 text-sm leading-relaxed text-[#64748B]">
              {order.notes}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
