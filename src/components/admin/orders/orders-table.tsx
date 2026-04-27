"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search, Eye, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AssignCourierDialog } from "./assign-courier-dialog";
import { formatCurrency } from "@/lib/format";
import type { Order, User } from "@/types";

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendiente", color: "bg-slate-100 text-slate-700" },
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

interface OrdersTableProps {
  initialOrders: Order[];
  couriers: User[];
}

export function OrdersTable({ initialOrders, couriers }: OrdersTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assignOrder, setAssignOrder] = useState<Order | null>(null);

  const filtered = initialOrders.filter((o) => {
    const matchesStatus = statusFilter === "all" || o.status === statusFilter;
    const term = search.toLowerCase();
    const matchesSearch =
      !term ||
      o.customer?.name?.toLowerCase().includes(term) ||
      o.courier?.name?.toLowerCase().includes(term) ||
      o.id.toLowerCase().includes(term);
    return matchesStatus && matchesSearch;
  });

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:gap-3">
          <div className="relative w-full sm:max-w-sm sm:flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
            <Input
              placeholder="Buscar por cliente o ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendiente</SelectItem>
              <SelectItem value="assigned">Asignado</SelectItem>
              <SelectItem value="in_transit">En camino</SelectItem>
              <SelectItem value="delivered">Entregado</SelectItem>
              <SelectItem value="returned">Devuelto</SelectItem>
              <SelectItem value="partial">Parcial</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button asChild className="bg-[#1E3A5F] hover:bg-[#2d4f7a]">
          <Link href="/orders/new">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Pedido
          </Link>
        </Button>
      </div>

      {/* Mobile cards (<md) */}
      <div className="space-y-3 md:hidden">
        {filtered.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-[#64748B]">
            No hay pedidos
          </div>
        ) : (
          filtered.map((order) => {
            const config = statusConfig[order.status] || statusConfig.pending;
            return (
              <div
                key={order.id}
                className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-[#1E293B]">
                      {order.customer?.name || "—"}
                    </p>
                    <p className="font-mono text-xs text-[#64748B]">
                      {order.id.slice(0, 8)}
                    </p>
                  </div>
                  <Badge variant="secondary" className={`${config.color} shrink-0`}>
                    {config.label}
                  </Badge>
                </div>

                <div className="mt-2 flex items-center justify-between text-xs text-[#64748B]">
                  <span className="truncate">
                    {order.courier?.name || "Sin asignar"}
                  </span>
                  <span>{formatDate(order.created_at)}</span>
                </div>

                <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
                  <span className="text-base font-semibold text-[#1E293B]">
                    {formatCurrency(order.total)}
                  </span>
                  <div className="flex gap-1">
                    <Link
                      href={`/orders/${order.id}`}
                      className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-[#3B82F6] hover:bg-blue-50"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Ver
                    </Link>
                    {order.status === "pending" && (
                      <button
                        onClick={() => setAssignOrder(order)}
                        className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-[#10B981] hover:bg-emerald-50"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        Asignar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop table (md+) */}
      <div className="hidden rounded-lg border border-slate-200 bg-white md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="hidden lg:table-cell">ID</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="hidden lg:table-cell">Domiciliario</TableHead>
              <TableHead className="text-center">Estado</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="hidden xl:table-cell">Fecha</TableHead>
              <TableHead className="w-[100px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-[#64748B]">
                  No hay pedidos
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((order) => {
                const config = statusConfig[order.status] || statusConfig.pending;
                return (
                  <TableRow key={order.id}>
                    <TableCell className="hidden font-mono text-xs text-[#64748B] lg:table-cell">
                      {order.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="font-medium text-[#1E293B]">
                      {order.customer?.name || "—"}
                    </TableCell>
                    <TableCell className="hidden text-[#64748B] lg:table-cell">
                      {order.courier?.name || "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className={config.color}>
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium text-[#1E293B]">
                      {formatCurrency(order.total)}
                    </TableCell>
                    <TableCell className="hidden text-sm text-[#64748B] xl:table-cell">
                      {formatDate(order.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Link
                          href={`/orders/${order.id}`}
                          className="rounded-md p-1.5 text-[#64748B] hover:bg-slate-100 hover:text-[#3B82F6]"
                          title="Ver detalle"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        {order.status === "pending" && (
                          <button
                            onClick={() => setAssignOrder(order)}
                            className="rounded-md p-1.5 text-[#64748B] hover:bg-slate-100 hover:text-[#10B981]"
                            title="Asignar domiciliario"
                          >
                            <UserPlus className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <AssignCourierDialog
        open={!!assignOrder}
        onClose={() => setAssignOrder(null)}
        order={assignOrder}
        couriers={couriers}
      />
    </>
  );
}
