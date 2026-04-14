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

  // Calculate paid amount per order
  function getOrderPaid(orderId: string): number {
    return payments
      .filter((p) => p.order_id === orderId)
      .reduce((sum, p) => sum + p.amount, 0);
  }

  return (
    <>
      <div className="flex gap-2 justify-end">
        <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Descargar PDF
          </Button>
        </a>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-[#64748B]">Total facturado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-[#1E293B]">{formatCurrency(totalBilled)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-[#64748B]">Total pagado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-[#10B981]">{formatCurrency(totalPaid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-[#64748B]">Saldo pendiente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-[#EF4444]">
              {formatCurrency(customer.pending_balance)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-[#64748B]">Pedidos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-[#1E3A5F]">{orders.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Orders table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-[#1E293B]">Pedidos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Pagado</TableHead>
                <TableHead className="text-right">Pendiente</TableHead>
                <TableHead>Fecha</TableHead>
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
                      <TableCell className="font-mono text-xs text-[#64748B]">
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
                        <span className={pending > 0 ? "text-[#EF4444] font-medium" : "text-[#10B981]"}>
                          {formatCurrency(pending)}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-[#64748B]">
                        {formatDate(order.created_at)}
                      </TableCell>
                      <TableCell>
                        {pending > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setPaymentOrder(order)}
                            className="text-[#10B981] border-[#10B981] hover:bg-emerald-50"
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
        </CardContent>
      </Card>

      {/* Payments history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-[#1E293B]">Historial de Pagos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Metodo</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Fecha</TableHead>
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
                    <TableCell className="font-mono text-xs text-[#64748B]">
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
                    <TableCell className="text-sm text-[#64748B]">
                      {formatDate(payment.created_at)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
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
