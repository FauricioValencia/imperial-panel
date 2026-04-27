"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Eye, DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";
import type { Customer } from "@/types";

interface BillingTableProps {
  customers: Customer[];
}

export function BillingTable({ customers }: BillingTableProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "with_balance" | "clear">("all");

  const filtered = customers.filter((c) => {
    const matchesSearch = !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.toLowerCase().includes(search.toLowerCase());

    const matchesFilter =
      filter === "all" ||
      (filter === "with_balance" && c.pending_balance > 0) ||
      (filter === "clear" && c.pending_balance === 0);

    return matchesSearch && matchesFilter;
  });

  const totalPending = filtered.reduce((sum, c) => sum + c.pending_balance, 0);

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm text-[#64748B]">Total por cobrar</p>
          <p className="text-xl font-bold text-[#EF4444] sm:text-2xl">
            {formatCurrency(totalPending)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm text-[#64748B]">Clientes con saldo</p>
          <p className="text-xl font-bold text-[#1E3A5F] sm:text-2xl">
            {customers.filter((c) => c.pending_balance > 0).length}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm text-[#64748B]">Clientes al dia</p>
          <p className="text-xl font-bold text-[#10B981] sm:text-2xl">
            {customers.filter((c) => c.pending_balance === 0).length}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-sm sm:flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
          <Input
            placeholder="Buscar cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
            className={`flex-1 sm:flex-none ${filter === "all" ? "bg-[#1E3A5F]" : ""}`}
          >
            Todos
          </Button>
          <Button
            variant={filter === "with_balance" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("with_balance")}
            className={`flex-1 sm:flex-none ${filter === "with_balance" ? "bg-[#EF4444]" : ""}`}
          >
            Con saldo
          </Button>
          <Button
            variant={filter === "clear" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("clear")}
            className={`flex-1 sm:flex-none ${filter === "clear" ? "bg-[#10B981]" : ""}`}
          >
            Al dia
          </Button>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {filtered.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-[#64748B]">
            No hay clientes
          </div>
        ) : (
          filtered.map((customer) => (
            <Link
              key={customer.id}
              href={`/billing/${customer.id}`}
              className="block rounded-lg border border-slate-200 bg-white p-3 shadow-sm hover:border-slate-300"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-[#1E293B]">{customer.name}</p>
                  {customer.phone && (
                    <p className="text-xs text-[#64748B]">{customer.phone}</p>
                  )}
                </div>
                {customer.pending_balance > 0 ? (
                  <Badge variant="secondary" className="bg-red-100 text-red-700">
                    Pendiente
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                    Al dia
                  </Badge>
                )}
              </div>
              <p className="mt-2 text-base font-semibold">
                <span className={customer.pending_balance > 0 ? "text-[#EF4444]" : "text-[#10B981]"}>
                  {formatCurrency(customer.pending_balance)}
                </span>
              </p>
            </Link>
          ))
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden rounded-lg border border-slate-200 bg-white md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead className="hidden lg:table-cell">Telefono</TableHead>
              <TableHead className="text-right">Saldo pendiente</TableHead>
              <TableHead className="text-center">Estado</TableHead>
              <TableHead className="w-[80px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-[#64748B]">
                  No hay clientes
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium text-[#1E293B]">
                    {customer.name}
                  </TableCell>
                  <TableCell className="hidden text-[#64748B] lg:table-cell">
                    {customer.phone || "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    <span className={customer.pending_balance > 0 ? "text-[#EF4444]" : "text-[#10B981]"}>
                      {formatCurrency(customer.pending_balance)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    {customer.pending_balance > 0 ? (
                      <Badge variant="secondary" className="bg-red-100 text-red-700">
                        Pendiente
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                        Al dia
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/billing/${customer.id}`}
                      className="rounded-md p-1.5 text-[#64748B] hover:bg-slate-100 hover:text-[#3B82F6]"
                      title="Ver detalle"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
