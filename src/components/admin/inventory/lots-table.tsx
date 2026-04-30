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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Search } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { BatchDetailDrawer } from "./batch-detail-drawer";
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

interface LotMargin {
  amount: number;
  percent: number;
  referencePrice: number;
  source: "lot" | "product";
}

// Margen estimado del lote: usa suggested_price si existe (override por lote),
// si no usa product.price. Devuelve null si no hay precio de referencia.
function lotMargin(lot: ProductLot): LotMargin | null {
  const reference = lot.suggested_price ?? lot.product?.price ?? null;
  if (reference === null || reference <= 0) return null;
  const amount = reference - lot.unit_cost;
  const percent = (amount / reference) * 100;
  return {
    amount,
    percent,
    referencePrice: reference,
    source: lot.suggested_price !== null ? "lot" : "product",
  };
}

function MarginBadge({ margin }: { margin: LotMargin | null }) {
  if (!margin) {
    return (
      <span className="text-xs text-[#64748B]" title="Sin precio de referencia">
        —
      </span>
    );
  }
  if (margin.percent < 0) {
    return (
      <Badge
        className="bg-[#EF4444] text-white hover:bg-[#EF4444]"
        title={`Pérdida estimada · referencia ${formatCurrency(margin.referencePrice)}`}
      >
        Pérdida {margin.percent.toFixed(0)}%
      </Badge>
    );
  }
  if (margin.percent < 20) {
    return (
      <Badge
        className="bg-[#F59E0B] text-white hover:bg-[#F59E0B]"
        title={`Margen bajo · referencia ${formatCurrency(margin.referencePrice)}`}
      >
        {formatCurrency(margin.amount)} · {margin.percent.toFixed(0)}%
      </Badge>
    );
  }
  return (
    <Badge
      className="bg-[#10B981] text-white hover:bg-[#10B981]"
      title={`Margen sano · referencia ${formatCurrency(margin.referencePrice)}${
        margin.source === "lot" ? " (precio del lote)" : ""
      }`}
    >
      {formatCurrency(margin.amount)} · {margin.percent.toFixed(0)}%
    </Badge>
  );
}

export function LotsTable({ lots }: LotsTableProps) {
  const [search, setSearch] = useState("");
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);
  const [showMargins, setShowMargins] = useState(false);

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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
          <Input
            placeholder="Buscar lote, producto o proveedor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowMargins((v) => !v)}
          className="self-start sm:self-auto"
        >
          {showMargins ? (
            <>
              <EyeOff className="mr-2 h-4 w-4" /> Ocultar márgenes
            </>
          ) : (
            <>
              <Eye className="mr-2 h-4 w-4" /> Mostrar márgenes
            </>
          )}
        </Button>
      </div>

      {/* Mobile cards (<md) */}
      <div className="space-y-3 md:hidden">
        {filtered.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-[#64748B]">
            {search ? "No se encontraron lotes" : "No hay lotes registrados"}
          </div>
        ) : (
          filtered.map((lot) => {
            const st = lotStatus(lot);
            const margin = showMargins ? lotMargin(lot) : null;
            return (
              <button
                key={lot.id}
                type="button"
                onClick={() => setSelectedLotId(lot.id)}
                className="block w-full rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm transition-colors hover:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-xs text-[#1E3A5F]">
                      {lot.lot_number}
                    </p>
                    <p className="mt-0.5 truncate text-sm font-medium text-[#1E293B]">
                      {lot.product?.name ?? "—"}
                    </p>
                    {lot.product?.codigo && (
                      <p className="font-mono text-[10px] text-[#64748B]">
                        {lot.product.codigo}
                      </p>
                    )}
                  </div>
                  <Badge className={`${st.className} shrink-0`}>{st.label}</Badge>
                </div>

                {showMargins && (
                  <div className="mt-2 flex items-center gap-2 border-t border-slate-100 pt-2">
                    <span className="text-[10px] uppercase tracking-wide text-[#64748B]">
                      Margen est.
                    </span>
                    <MarginBadge margin={margin} />
                  </div>
                )}

                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-2 text-xs">
                  <div>
                    <p className="text-[#64748B]">Restante</p>
                    <p className="font-semibold text-[#10B981]">
                      {lot.quantity_remaining}
                      <span className="ml-1 font-normal text-[#64748B]">
                        / {lot.quantity_received}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[#64748B]">Costo</p>
                    <p className="font-medium text-[#1E293B]">
                      {formatCurrency(lot.unit_cost)}
                      {lot.is_estimated_cost && (
                        <span className="ml-1 text-[9px] text-[#F59E0B]">est.</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#64748B]">Vence</p>
                    <p className="font-medium text-[#1E293B]">
                      {lot.expires_at
                        ? new Date(lot.expires_at).toLocaleDateString("es-CO", {
                            day: "2-digit",
                            month: "short",
                          })
                        : "—"}
                    </p>
                  </div>
                </div>

                {lot.supplier && (
                  <p className="mt-2 truncate text-[10px] text-[#64748B]">
                    Proveedor: {lot.supplier}
                  </p>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Desktop table (md+) */}
      <div className="hidden rounded-lg border border-slate-200 bg-white md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lote</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead className="text-right">Recibido</TableHead>
              <TableHead className="text-right">Restante</TableHead>
              <TableHead className="text-right">Costo unit.</TableHead>
              {showMargins && (
                <TableHead className="text-center">Margen est.</TableHead>
              )}
              <TableHead>Vencimiento</TableHead>
              <TableHead className="hidden lg:table-cell">Proveedor</TableHead>
              <TableHead className="text-center">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={showMargins ? 9 : 8}
                  className="text-center text-[#64748B]"
                >
                  {search ? "No se encontraron lotes" : "No hay lotes registrados"}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((lot) => {
                const st = lotStatus(lot);
                const margin = showMargins ? lotMargin(lot) : null;
                return (
                  <TableRow
                    key={lot.id}
                    onClick={() => setSelectedLotId(lot.id)}
                    className="cursor-pointer hover:bg-slate-50"
                  >
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
                    {showMargins && (
                      <TableCell className="text-center">
                        <MarginBadge margin={margin} />
                      </TableCell>
                    )}
                    <TableCell className="text-[#64748B]">
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

      <BatchDetailDrawer
        lotId={selectedLotId}
        onClose={() => setSelectedLotId(null)}
      />
    </div>
  );
}
