import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getOrder, listCouriers } from "@/actions/orders";
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
import { Button } from "@/components/ui/button";
import { AssignCourierDialog } from "@/components/admin/orders/assign-courier-dialog";
import { OrderDetailActions } from "@/components/admin/orders/order-detail-actions";

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendiente", color: "bg-slate-100 text-slate-700" },
  assigned: { label: "Asignado", color: "bg-blue-100 text-blue-700" },
  in_transit: { label: "En camino", color: "bg-amber-100 text-amber-700" },
  delivered: { label: "Entregado", color: "bg-emerald-100 text-emerald-700" },
  returned: { label: "Devuelto", color: "bg-red-100 text-red-700" },
  partial: { label: "Parcial", color: "bg-orange-100 text-orange-700" },
};

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
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/orders"
          className="rounded-md p-1.5 text-[#64748B] hover:bg-slate-100 hover:text-[#1E293B]"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-[#1E293B]">
              Pedido #{order.id.slice(0, 8)}
            </h2>
            <Badge variant="secondary" className={config.color}>
              {config.label}
            </Badge>
          </div>
          <p className="text-sm text-[#64748B]">
            Creado el {formatDate(order.created_at)}
          </p>
        </div>
        <OrderDetailActions order={order} couriers={couriers} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-[#64748B]">Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium text-[#1E293B]">{order.customer?.name}</p>
            {order.customer?.phone && (
              <p className="text-sm text-[#64748B]">{order.customer.phone}</p>
            )}
            {order.customer?.address && (
              <p className="text-sm text-[#64748B]">{order.customer.address}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-[#64748B]">Domiciliario</CardTitle>
          </CardHeader>
          <CardContent>
            {order.courier ? (
              <>
                <p className="font-medium text-[#1E293B]">{order.courier.name}</p>
                <p className="text-sm text-[#64748B]">{order.courier.email}</p>
                {order.assigned_at && (
                  <p className="mt-1 text-xs text-[#64748B]">
                    Asignado: {formatDate(order.assigned_at)}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-[#64748B]">Sin asignar</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-[#64748B]">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-[#1E3A5F]">
              {formatCurrency(order.total)}
            </p>
            {order.delivered_at && (
              <p className="mt-1 text-xs text-[#64748B]">
                Entregado: {formatDate(order.delivered_at)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-[#1E293B]">Items del Pedido</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead className="text-center">Cantidad</TableHead>
                <TableHead className="text-right">Precio Unit.</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
                <TableHead className="text-center">Devuelto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium text-[#1E293B]">
                    {item.product?.name || "—"}
                  </TableCell>
                  <TableCell className="text-center">{item.quantity}</TableCell>
                  <TableCell className="text-right text-[#64748B]">
                    {formatCurrency(item.unit_price)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(item.quantity * item.unit_price)}
                  </TableCell>
                  <TableCell className="text-center">
                    {item.returned_quantity > 0 ? (
                      <Badge variant="destructive" className="bg-[#EF4444]">
                        {item.returned_quantity} devuelto{item.returned_quantity > 1 ? "s" : ""}
                      </Badge>
                    ) : (
                      <span className="text-[#64748B]">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {order.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-[#1E293B]">Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[#64748B]">{order.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
