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
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm text-[#64748B]">Total por cobrar</p>
          <p className="text-2xl font-bold text-[#EF4444]">
            {formatCurrency(totalPending)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm text-[#64748B]">Clientes con saldo</p>
          <p className="text-2xl font-bold text-[#1E3A5F]">
            {customers.filter((c) => c.pending_balance > 0).length}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm text-[#64748B]">Clientes al dia</p>
          <p className="text-2xl font-bold text-[#10B981]">
            {customers.filter((c) => c.pending_balance === 0).length}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
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
            className={filter === "all" ? "bg-[#1E3A5F]" : ""}
          >
            Todos
          </Button>
          <Button
            variant={filter === "with_balance" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("with_balance")}
            className={filter === "with_balance" ? "bg-[#EF4444]" : ""}
          >
            Con saldo
          </Button>
          <Button
            variant={filter === "clear" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("clear")}
            className={filter === "clear" ? "bg-[#10B981]" : ""}
          >
            Al dia
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Telefono</TableHead>
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
                  <TableCell className="text-[#64748B]">
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
