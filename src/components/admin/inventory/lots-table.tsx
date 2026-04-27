"use client";

import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { ProductLot } from "@/types";

interface LotsTableProps {
  lots: ProductLot[];
}

function daysUntil(date: string | null): number | null {
  if (!date) return null;
  const diff = new Date(date).getTime() - Date.now();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function lotStatus(lot: ProductLot): { label: string; className: string } {
  if (!lot.active) return { label: "Inactivo", className: "bg-slate-400 text-white" };
  if (lot.quantity_remaining === 0) return { label: "Agotado", className: "bg-slate-400 text-white" };
  const days = daysUntil(lot.expires_at);
  if (days === null) return { label: "Vigente", className: "bg-[#10B981] text-white" };
  if (days < 0) return { label: "Vencido", className: "bg-[#EF4444] text-white" };
  if (days < 7) return { label: `Vence en ${days}d`, className: "bg-[#EF4444] text-white" };
  if (days < 15) return { label: `Vence en ${days}d`, className: "bg-[#F59E0B] text-white" };
  return { label: "Vigente", className: "bg-[#10B981] text-white" };
}

export function LotsTable({ lots }: LotsTableProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    if (!term) return lots;
    return lots.filter(
      (l) =>
        l.lot_number.toLowerCase().includes(term) ||
        l.product?.name?.toLowerCase().includes(term) ||
        l.product?.codigo?.toLowerCase().includes(term) ||
        l.supplier?.toLowerCase().includes(term)
    );
  }, [lots, search]);

  return (
    <div className="space-y-3">
      <div className="relative w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
        <Input
          placeholder="Buscar lote, producto o proveedor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lote</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead className="text-right">Recibido</TableHead>
              <TableHead className="text-right">Restante</TableHead>
              <TableHead className="text-right">Costo unit.</TableHead>
              <TableHead className="hidden md:table-cell">Vencimiento</TableHead>
              <TableHead className="hidden lg:table-cell">Proveedor</TableHead>
              <TableHead className="text-center">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-[#64748B]">
                  {search ? "No se encontraron lotes" : "No hay lotes registrados"}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((lot) => {
                const st = lotStatus(lot);
                return (
                  <TableRow key={lot.id}>
                    <TableCell className="font-mono text-xs text-[#1E293B]">
                      {lot.lot_number}
                    </TableCell>
                    <TableCell className="text-[#1E293B]">
                      {lot.product?.name ?? "—"}
                      {lot.product?.codigo && (
                        <span className="ml-1 text-xs text-[#64748B]">
                          ({lot.product.codigo})
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-[#64748B]">
                      {lot.quantity_received}
                    </TableCell>
                    <TableCell className="text-right font-medium text-[#1E293B]">
                      {lot.quantity_remaining}
                    </TableCell>
                    <TableCell className="text-right text-[#1E293B]">
                      {formatCurrency(lot.unit_cost)}
                      {lot.is_estimated_cost && (
                        <span
                          className="ml-1 text-[10px] text-[#F59E0B]"
                          title="Costo estimado · edita para registrar el costo real"
                        >
                          (est.)
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-[#64748B]">
                      {lot.expires_at
                        ? new Date(lot.expires_at).toLocaleDateString("es-CO")
                        : "Sin vencimiento"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-[#64748B]">
                      {lot.supplier || "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={st.className}>{st.label}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
