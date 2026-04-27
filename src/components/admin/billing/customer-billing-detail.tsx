"use client";

import { useState } from "react";
import { DollarSign, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { RegisterPaymentDialog } from "./register-payment-dialog";
import { formatCurrency } from "@/lib/format";
import type { Customer, Order, Payment } from "@/types";

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

const statusLabels: Record<string, string> = {
  pending: "Pendiente",
  assigned: "Asignado",
  in_transit: "En camino",
  delivered: "Entregado",
  returned: "Devuelto",
  partial: "Parcial",
};

const methodLabels: Record<string, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  nequi: "Nequi",
  daviplata: "Daviplata",
};

interface CustomerBillingDetailProps {
  customer: Customer;
  orders: Order[];
  payments: Payment[];
  totalBilled: number;
  totalPaid: number;
}

export function CustomerBillingDetail({
  customer,
  orders,
  payments,
  totalBilled,
  totalPaid,
}: CustomerBillingDetailProps) {
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null);
  const pdfUrl = `/api/pdf/ticket/${customer.id}`;

  function getOrderPaid(orderId: string): number {
    return payments
      .filter((p) => p.order_id === orderId)
      .reduce((sum, p) => sum + p.amount, 0);
  }

  return (
    <>
      <div className="flex justify-end gap-2">
        <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Descargar PDF
          </Button>
        </a>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-[#64748B] sm:text-sm">Total facturado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold text-[#1E293B] sm:text-xl">{formatCurrency(totalBilled)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-[#64748B] sm:text-sm">Total pagado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold text-[#10B981] sm:text-xl">{formatCurrency(totalPaid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-[#64748B] sm:text-sm">Saldo pendiente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold text-[#EF4444] sm:text-xl">
              {formatCurrency(customer.pending_balance)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-[#64748B] sm:text-sm">Pedidos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold text-[#1E3A5F] sm:text-xl">{orders.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-[#1E293B]">Pedidos</CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {orders.length === 0 ? (
              <p className="py-4 text-center text-sm text-[#64748B]">No hay pedidos</p>
            ) : (
              orders.map((order) => {
                const paid = getOrderPaid(order.id);
                const pending = order.total - paid;
                return (
                  <div
                    key={order.id}
                    className="rounded-lg border border-slate-200 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-xs text-[#64748B]">{order.id.slice(0, 8)}</p>
                        <p className="text-xs text-[#64748B]">{formatDate(order.created_at)}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {statusLabels[order.status] || order.status}
                      </Badge>
                    </div>
                    <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <dt className="text-[#64748B]">Total</dt>
                        <dd className="font-medium text-[#1E293B]">{formatCurrency(order.total)}</dd>
                      </div>
                      <div>
                        <dt className="text-[#64748B]">Pagado</dt>
                        <dd className="font-medium text-[#10B981]">{formatCurrency(paid)}</dd>
                      </div>
                      <div>
                        <dt className="text-[#64748B]">Pendiente</dt>
                        <dd className={pending > 0 ? "font-medium text-[#EF4444]" : "font-medium text-[#10B981]"}>
                          {formatCurrency(pending)}
                        </dd>
                      </div>
                    </dl>
                    {pending > 0 && (
                      <div className="mt-3 flex justify-end border-t border-slate-100 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPaymentOrder(order)}
                          className="border-[#10B981] text-[#10B981] hover:bg-emerald-50"
                        >
                          <DollarSign className="mr-1 h-3 w-3" />
                          Pagar
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="hidden lg:table-cell">ID</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Pagado</TableHead>
                  <TableHead className="text-right">Pendiente</TableHead>
                  <TableHead className="hidden lg:table-cell">Fecha</TableHead>
                  <TableHead className="w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-[#64748B]">
                      No hay pedidos
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => {
                    const paid = getOrderPaid(order.id);
                    const pending = order.total - paid;
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="hidden font-mono text-xs text-[#64748B] lg:table-cell">
                          {order.id.slice(0, 8)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {statusLabels[order.status] || order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(order.total)}
                        </TableCell>
                        <TableCell className="text-right text-[#10B981]">
                          {formatCurrency(paid)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={pending > 0 ? "font-medium text-[#EF4444]" : "text-[#10B981]"}>
                            {formatCurrency(pending)}
                          </span>
                        </TableCell>
                        <TableCell className="hidden text-sm text-[#64748B] lg:table-cell">
                          {formatDate(order.created_at)}
                        </TableCell>
                        <TableCell>
                          {pending > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setPaymentOrder(order)}
                              className="border-[#10B981] text-[#10B981] hover:bg-emerald-50"
                            >
                              <DollarSign className="mr-1 h-3 w-3" />
                              Pagar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Payments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-[#1E293B]">Historial de Pagos</CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {payments.length === 0 ? (
              <p className="py-4 text-center text-sm text-[#64748B]">No hay pagos registrados</p>
            ) : (
              payments.map((payment) => (
                <div
                  key={payment.id}
                  className="rounded-lg border border-slate-200 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs text-[#64748B]">
                        {payment.order_id.slice(0, 8)}
                      </p>
                      <p className="text-xs text-[#64748B]">{formatDate(payment.created_at)}</p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={
                        payment.type === "full"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-blue-100 text-blue-700"
                      }
                    >
                      {payment.type === "full" ? "Completo" : "Abono"}
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-[#64748B]">
                      {methodLabels[payment.payment_method] || payment.payment_method}
                    </span>
                    <span className="font-medium text-[#10B981]">
                      {formatCurrency(payment.amount)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="hidden lg:table-cell">Pedido</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Metodo</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead className="hidden lg:table-cell">Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-[#64748B]">
                      No hay pagos registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="hidden font-mono text-xs text-[#64748B] lg:table-cell">
                        {payment.order_id.slice(0, 8)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={
                            payment.type === "full"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-blue-100 text-blue-700"
                          }
                        >
                          {payment.type === "full" ? "Completo" : "Abono"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[#64748B]">
                        {methodLabels[payment.payment_method] || payment.payment_method}
                      </TableCell>
                      <TableCell className="text-right font-medium text-[#10B981]">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell className="hidden text-sm text-[#64748B] lg:table-cell">
                        {formatDate(payment.created_at)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {paymentOrder && (
        <RegisterPaymentDialog
          open={!!paymentOrder}
          onClose={() => setPaymentOrder(null)}
          order={paymentOrder}
          totalPaid={getOrderPaid(paymentOrder.id)}
        />
      )}
    </>
  );
}
