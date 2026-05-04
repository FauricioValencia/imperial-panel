"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Plus,
  Search,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { listLots } from "@/actions/inventory";
import { BatchDetailDrawer } from "./batch-detail-drawer";
import { NewLotDialog } from "./new-lot-dialog";
import { ProductCombobox } from "./product-combobox";
import type {
  ListLotsFilters,
  ListLotsResult,
  LotListStatus,
  LotSortDirection,
  LotSortField,
  Product,
  ProductLot,
} from "@/types";

interface LotsTableProps {
  initialResult: ListLotsResult;
  products: Product[];
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

const STATUS_OPTIONS: Array<{ value: LotListStatus; label: string }> = [
  { value: "active", label: "Vigentes" },
  { value: "expiring", label: "Por vencer (30d)" },
  { value: "expired", label: "Vencidos" },
  { value: "depleted", label: "Agotados" },
  { value: "all", label: "Todos" },
];

type SortKey = `${LotSortField}_${LotSortDirection}`;

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: "received_at_desc", label: "Recientes primero" },
  { value: "received_at_asc", label: "Antiguos primero" },
  { value: "expires_at_asc", label: "Vencen pronto primero" },
  { value: "expires_at_desc", label: "Vencen mas tarde primero" },
  { value: "quantity_remaining_desc", label: "Mayor stock restante" },
  { value: "quantity_remaining_asc", label: "Menor stock restante" },
  { value: "unit_cost_desc", label: "Mayor costo" },
  { value: "unit_cost_asc", label: "Menor costo" },
];

export function LotsTable({ initialResult, products }: LotsTableProps) {
  const [result, setResult] = useState<ListLotsResult>(initialResult);
  const [filters, setFilters] = useState<Partial<ListLotsFilters>>({
    status: "active",
    sort_field: "received_at",
    sort_dir: "desc",
    page: 1,
    page_size: 25,
  });
  const [searchInput, setSearchInput] = useState("");
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);
  const [showMargins, setShowMargins] = useState(false);
  const [showNewLot, setShowNewLot] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isFirstRender = useRef(true);

  // Debounce de search: 300ms despues de teclear, aplica el filtro y vuelve
  // a pagina 1.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setFilters((prev) => ({
        ...prev,
        search: searchInput.trim() || undefined,
        page: 1,
      }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Cuando cambian los filtros (excepto en el primer render con initialResult),
  // dispara fetch.
  const isInitialFilters = useRef(true);
  useEffect(() => {
    if (isInitialFilters.current) {
      isInitialFilters.current = false;
      return;
    }
    startTransition(async () => {
      const res = await listLots(filters);
      if (res.success && res.data) {
        setResult(res.data);
      }
    });
  }, [filters]);

  function refresh() {
    startTransition(async () => {
      const res = await listLots(filters);
      if (res.success && res.data) {
        setResult(res.data);
      }
    });
  }

  const sortKey: SortKey = `${filters.sort_field ?? "received_at"}_${filters.sort_dir ?? "desc"}`;

  function handleStatusChange(value: string) {
    setFilters((prev) => ({ ...prev, status: value as LotListStatus, page: 1 }));
  }
  function handleProductChange(value: string) {
    setFilters((prev) => ({ ...prev, product_id: value || undefined, page: 1 }));
  }
  function handleSortChange(value: string) {
    const [field, dir] = value.split("_") as [LotSortField, LotSortDirection];
    setFilters((prev) => ({ ...prev, sort_field: field, sort_dir: dir, page: 1 }));
  }
  function handlePageChange(delta: number) {
    setFilters((prev) => ({
      ...prev,
      page: Math.min(Math.max(1, (prev.page ?? 1) + delta), Math.max(1, result.total_pages)),
    }));
  }

  const lots = result.lots;
  const rangeStart = result.total === 0 ? 0 : (result.page - 1) * result.page_size + 1;
  const rangeEnd = Math.min(result.page * result.page_size, result.total);
  const colSpan = useMemo(() => (showMargins ? 9 : 8), [showMargins]);

  return (
    <div className="space-y-3">
      {/* Toolbar de filtros */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-[1fr_180px_220px_220px_auto_auto]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
          <Input
            placeholder="Buscar lote o proveedor..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
            aria-label="Buscar lote o proveedor"
          />
        </div>
        <Select value={filters.status ?? "active"} onValueChange={handleStatusChange}>
          <SelectTrigger aria-label="Filtrar por estado">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ProductCombobox
          products={products}
          value={filters.product_id ?? ""}
          onChange={handleProductChange}
          allowEmpty
          emptyLabel="Todos los productos"
          placeholder="Todos los productos"
        />
        <Select value={sortKey} onValueChange={handleSortChange}>
          <SelectTrigger aria-label="Ordenar">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowMargins((v) => !v)}
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
        <Button
          type="button"
          size="sm"
          onClick={() => setShowNewLot(true)}
          className="bg-[#10B981] hover:bg-[#059669]"
        >
          <Plus className="mr-2 h-4 w-4" /> Nuevo lote
        </Button>
      </div>

      {isPending && (
        <p className="text-xs text-[#64748B]">Cargando...</p>
      )}

      {/* Mobile cards (<md) */}
      <div className="space-y-3 md:hidden">
        {lots.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-[#64748B]">
            No se encontraron lotes con los filtros aplicados
          </div>
        ) : (
          lots.map((lot) => {
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
            {lots.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colSpan} className="text-center text-[#64748B]">
                  No se encontraron lotes con los filtros aplicados
                </TableCell>
              </TableRow>
            ) : (
              lots.map((lot) => {
                const st = lotStatus(lot);
                const margin = showMargins ? lotMargin(lot) : null;
                return (
                  <TableRow
                    key={lot.id}
                    onClick={() => setSelectedLotId(lot.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedLotId(lot.id);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`Ver detalle del lote ${lot.lot_number}`}
                    className="cursor-pointer hover:bg-slate-50 focus-visible:bg-slate-100 focus-visible:outline-none"
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

      {/* Footer de paginacion */}
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-[#64748B]">
          {result.total === 0
            ? "Sin resultados"
            : `Mostrando ${rangeStart}-${rangeEnd} de ${result.total} lote(s)`}
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(-1)}
            disabled={isPending || result.page <= 1}
            aria-label="Pagina anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-[#64748B]">
            Pag. {result.page} / {Math.max(1, result.total_pages)}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(1)}
            disabled={isPending || result.page >= result.total_pages}
            aria-label="Pagina siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <BatchDetailDrawer
        lotId={selectedLotId}
        onClose={() => {
          setSelectedLotId(null);
          // Refrescar la lista al cerrar el drawer (puede haber cambiado el lote)
          refresh();
        }}
      />

      <NewLotDialog
        open={showNewLot}
        onClose={() => setShowNewLot(false)}
        onCreated={refresh}
        products={products}
      />
    </div>
  );
}
