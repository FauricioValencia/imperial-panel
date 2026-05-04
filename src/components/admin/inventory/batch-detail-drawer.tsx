"use client";

import { useEffect, useState, useTransition } from "react";
import { Calendar, Truck, AlertTriangle, X, Save, PackageMinus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getBatch, registerLotShrinkage, updateBatch } from "@/actions/inventory";
import { listCustomers } from "@/actions/customers";
import { getLotProfitability } from "@/actions/lot-analytics";
import { formatCurrency } from "@/lib/format";
import { CustomerCombobox } from "./customer-combobox";
import type { BatchDetail, Customer, InventoryMovement, LotProfitabilityRow } from "@/types";

interface BatchDetailDrawerProps {
  lotId: string | null;
  onClose: () => void;
}

const ACTIVE_ORDER_STATUSES = new Set(["pending", "assigned", "in_transit"]);

function statusBadge(detail: BatchDetail): { label: string; className: string } {
  if (!detail.active) return { label: "Cerrado", className: "bg-slate-400 text-white" };
  if (detail.quantity_remaining === 0) return { label: "Agotado", className: "bg-slate-400 text-white" };
  if (!detail.expires_at) return { label: "Vigente", className: "bg-[#10B981] text-white" };
  const days = Math.floor((new Date(detail.expires_at).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { label: "Vencido", className: "bg-[#EF4444] text-white" };
  if (days < 7) return { label: `Vence en ${days}d`, className: "bg-[#EF4444] text-white" };
  if (days < 15) return { label: `Vence en ${days}d`, className: "bg-[#F59E0B] text-white" };
  return { label: "Vigente", className: "bg-[#10B981] text-white" };
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function BatchDetailDrawer({ lotId, onClose }: BatchDetailDrawerProps) {
  const [detail, setDetail] = useState<BatchDetail | null>(null);
  const [profitability, setProfitability] = useState<LotProfitabilityRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [shrinking, setShrinking] = useState(false);

  // Reset + fetch al cambiar de lote: patron "reset state on prop change".
  // Linter estricto de React 19 reporta setState dentro de effect, pero aqui
  // sincronizamos un fetch con cambio de prop (no hay key disponible porque
  // el drawer es un singleton montado una vez).
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!lotId) {
      setDetail(null);
      setProfitability([]);
      setError(null);
      setEditing(false);
      setShrinking(false);
      return;
    }
    setLoading(true);
    setError(null);
    Promise.all([getBatch(lotId), getLotProfitability(lotId)]).then(
      ([detailRes, profRes]) => {
        if (detailRes.success && detailRes.data) {
          setDetail(detailRes.data);
        } else {
          setError(detailRes.error ?? "Error al cargar el lote");
        }
        if (profRes.success && profRes.data) {
          setProfitability(profRes.data);
        }
        setLoading(false);
      }
    );
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [lotId]);

  function refresh() {
    if (!lotId) return;
    Promise.all([getBatch(lotId), getLotProfitability(lotId)]).then(
      ([detailRes, profRes]) => {
        if (detailRes.success && detailRes.data) setDetail(detailRes.data);
        if (profRes.success && profRes.data) setProfitability(profRes.data);
      }
    );
  }

  return (
    <Sheet open={!!lotId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-lg">
        <SheetHeader className="border-b border-slate-100 px-4 py-4 sm:px-6">
          <SheetTitle className="text-[#1E3A5F]">Detalle del Lote</SheetTitle>
          <SheetDescription>
            Trazabilidad completa: stock, costo, asignaciones y movimientos.
          </SheetDescription>
        </SheetHeader>

        {loading && (
          <div className="px-4 sm:px-6">
            <DrawerSkeleton />
          </div>
        )}

        {error && (
          <div className="mx-4 mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:mx-6">
            {error}
          </div>
        )}

        {detail && !loading && (
          <div className="space-y-5 px-4 pt-4 pb-6 sm:px-6">
            <BatchHeader detail={detail} />

            <Separator />

            <BatchInventory detail={detail} />

            <Separator />

            <BatchFinancialAnalysis detail={detail} profitability={profitability} />

            <Separator />

            <BatchMetadata detail={detail} />

            <Separator />

            <BatchAllocations detail={detail} />

            <Separator />

            <BatchMovements detail={detail} />

            {detail.active && detail.quantity_remaining > 0 && (
              <>
                <Separator />

                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShrinking(true)}
                    className="w-full sm:w-auto"
                  >
                    <PackageMinus className="mr-2 h-4 w-4" />
                    Registrar merma / muestra
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="w-full bg-[#1E3A5F] hover:bg-[#2d4f7a] sm:w-auto"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Editar lote
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {detail && (
          <EditMetadataDialog
            open={editing}
            onClose={() => setEditing(false)}
            detail={detail}
            onSaved={() => {
              setEditing(false);
              refresh();
            }}
          />
        )}

        {detail && (
          <LotShrinkageDialog
            open={shrinking}
            onClose={() => setShrinking(false)}
            detail={detail}
            onSaved={() => {
              setShrinking(false);
              refresh();
            }}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function DrawerSkeleton() {
  return (
    <div className="mt-4 space-y-4">
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

function BatchHeader({ detail }: { detail: BatchDetail }) {
  const st = statusBadge(detail);
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-sm text-[#1E3A5F]">{detail.lot_number}</p>
          <p className="text-base font-semibold wrap-break-word text-[#1E293B]">
            {detail.product.name}
          </p>
          {detail.product.codigo && (
            <p className="font-mono text-xs text-[#64748B]">{detail.product.codigo}</p>
          )}
        </div>
        <Badge className={`${st.className} shrink-0 whitespace-nowrap`}>{st.label}</Badge>
      </div>
    </div>
  );
}

function BatchInventory({ detail }: { detail: BatchDetail }) {
  const consumedPct =
    detail.quantity_received > 0
      ? Math.round((detail.consumed_quantity / detail.quantity_received) * 100)
      : 0;

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Inventario</h3>
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-[#64748B]">Recibido</p>
          <p className="font-semibold text-[#1E293B]">{detail.quantity_received}</p>
        </div>
        <div>
          <p className="text-[#64748B]">Restante</p>
          <p className="font-semibold text-[#10B981]">{detail.quantity_remaining}</p>
        </div>
        <div>
          <p className="text-[#64748B]">Consumido</p>
          <p className="font-semibold text-[#1E293B]">
            {detail.consumed_quantity} <span className="text-xs text-[#64748B]">({consumedPct}%)</span>
          </p>
        </div>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full bg-[#3B82F6] transition-all"
          style={{ width: `${consumedPct}%` }}
        />
      </div>
      {detail.total_allocated_active > 0 && (
        <p className="flex items-center gap-1 text-xs text-[#F59E0B]">
          <AlertTriangle className="h-3 w-3" />
          {detail.total_allocated_active} unidad(es) asignada(s) en pedidos activos
        </p>
      )}
    </div>
  );
}

function marginToneClass(percent: number): string {
  if (percent < 0) return "text-[#EF4444]";
  if (percent < 20) return "text-[#F59E0B]";
  return "text-[#10B981]";
}

function BatchFinancialAnalysis({
  detail,
  profitability,
}: {
  detail: BatchDetail;
  profitability: LotProfitabilityRow[];
}) {
  const totalInvestment = detail.unit_cost * detail.quantity_received;
  const remainingValue = detail.unit_cost * detail.quantity_remaining;

  // Margen estimado: usa suggested_price del lote si existe, si no
  // product.price. Coherente con la columna de la tabla y el preview
  // del form de creacion.
  const referencePrice = detail.suggested_price ?? detail.product.price;
  const estimatedUnitMargin = referencePrice - detail.unit_cost;
  const estimatedMarginPct =
    referencePrice > 0 ? (estimatedUnitMargin / referencePrice) * 100 : 0;
  const priceSource = detail.suggested_price !== null ? "lote" : "producto";

  // Rentabilidad real: suma de allocations entregadas (vista filtra
  // status delivered/partial). Si esta vacia, no hubo ventas entregadas.
  const hasRealSales = profitability.length > 0;
  const realRevenue = profitability.reduce((s, p) => s + Number(p.total_revenue), 0);
  const realCogs = profitability.reduce((s, p) => s + Number(p.total_cost), 0);
  const realMargin = realRevenue - realCogs;
  const realMarginPct = realRevenue > 0 ? (realMargin / realRevenue) * 100 : 0;
  const realQtySold = profitability.reduce((s, p) => s + Number(p.quantity_sold), 0);

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
        Análisis financiero
      </h3>

      <div className="grid grid-cols-2 gap-x-3 gap-y-3 text-sm">
        <div className="min-w-0">
          <p className="text-[#64748B]">Costo unitario</p>
          <p className="font-semibold wrap-break-word text-[#1E293B]">
            {formatCurrency(detail.unit_cost)}
            {detail.is_estimated_cost && (
              <span className="ml-1 text-[10px] text-[#F59E0B]">(estimado)</span>
            )}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-[#64748B]">
            Precio referencia <span className="text-[10px]">({priceSource})</span>
          </p>
          <p className="font-semibold wrap-break-word text-[#1E293B]">
            {formatCurrency(referencePrice)}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-[#64748B]">Margen estimado</p>
          <p className={`font-semibold wrap-break-word ${marginToneClass(estimatedMarginPct)}`}>
            {formatCurrency(estimatedUnitMargin)}{" "}
            <span className="text-xs">({estimatedMarginPct.toFixed(1)}%)</span>
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-[#64748B]">Inversión total</p>
          <p className="font-semibold wrap-break-word text-[#1E293B]">
            {formatCurrency(totalInvestment)}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-[#64748B]">Valor vigente</p>
          <p className="font-semibold wrap-break-word text-[#10B981]">
            {formatCurrency(remainingValue)}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-[#64748B]">Rentabilidad esperada</p>
          <p className={`font-semibold wrap-break-word ${marginToneClass(estimatedMarginPct)}`}>
            {formatCurrency(estimatedUnitMargin * detail.quantity_received)}
          </p>
        </div>
      </div>

      {hasRealSales && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-800">
            Rentabilidad real ({realQtySold} unidades vendidas)
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="min-w-0">
              <p className="text-[#64748B]">Ingresos</p>
              <p className="font-semibold wrap-break-word text-[#1E293B]">
                {formatCurrency(realRevenue)}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-[#64748B]">COGS real</p>
              <p className="font-semibold wrap-break-word text-[#1E293B]">
                {formatCurrency(realCogs)}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-[#64748B]">Margen real</p>
              <p className={`font-semibold wrap-break-word ${marginToneClass(realMarginPct)}`}>
                {formatCurrency(realMargin)}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-[#64748B]">Margen %</p>
              <p className={`font-semibold ${marginToneClass(realMarginPct)}`}>
                {realMarginPct.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BatchMetadata({ detail }: { detail: BatchDetail }) {
  return (
    <div className="space-y-2 text-sm">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Detalles</h3>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="flex items-start gap-2">
          <Calendar className="h-4 w-4 shrink-0 text-[#64748B]" />
          <div>
            <p className="text-xs text-[#64748B]">Recibido</p>
            <p className="text-[#1E293B]">{formatDate(detail.received_at)}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Calendar className="h-4 w-4 shrink-0 text-[#64748B]" />
          <div>
            <p className="text-xs text-[#64748B]">Vencimiento</p>
            <p className="text-[#1E293B]">
              {detail.expires_at ? formatDate(detail.expires_at) : "Sin vencimiento"}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Truck className="h-4 w-4 shrink-0 text-[#64748B]" />
          <div>
            <p className="text-xs text-[#64748B]">Proveedor</p>
            <p className="text-[#1E293B]">{detail.supplier || "—"}</p>
          </div>
        </div>
      </div>
      {detail.notes && (
        <div className="rounded-md bg-slate-50 p-2 text-xs whitespace-pre-line text-[#64748B]">
          {detail.notes}
        </div>
      )}
    </div>
  );
}

function BatchAllocations({ detail }: { detail: BatchDetail }) {
  const active = detail.allocations.filter((a) => ACTIVE_ORDER_STATUSES.has(a.order_status));
  const closed = detail.allocations.filter((a) => !ACTIVE_ORDER_STATUSES.has(a.order_status));

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
        Asignaciones a pedidos
      </h3>
      {detail.allocations.length === 0 ? (
        <p className="text-xs text-[#64748B]">Aun no se ha consumido este lote en pedidos.</p>
      ) : (
        <>
          {active.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-[#F59E0B]">Activas ({active.length})</p>
              {active.slice(0, 5).map((a) => (
                <AllocationRow key={a.allocation_id} alloc={a} />
              ))}
            </div>
          )}
          {closed.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-[#64748B]">
                Entregadas / cerradas ({closed.length})
              </p>
              {closed.slice(0, 10).map((a) => (
                <AllocationRow key={a.allocation_id} alloc={a} />
              ))}
              {closed.length > 10 && (
                <p className="text-xs text-[#64748B]">
                  +{closed.length - 10} mas
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AllocationRow({ alloc }: { alloc: BatchDetail["allocations"][number] }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-slate-100 bg-white px-2 py-1.5 text-xs">
      <div className="min-w-0">
        <p className="truncate font-medium text-[#1E293B]">{alloc.customer_name}</p>
        <p className="text-[10px] text-[#64748B]">
          {formatDateTime(alloc.delivered_at ?? alloc.created_at)} · {alloc.order_status}
        </p>
      </div>
      <div className="ml-2 shrink-0 text-right">
        <p className="font-semibold text-[#1E293B]">-{alloc.quantity}</p>
        <p className="text-[10px] text-[#64748B]">{formatCurrency(alloc.unit_cost_snapshot)}</p>
      </div>
    </div>
  );
}

// Tipos de movimiento que siempre restan stock (cantidad siempre positiva en DB).
const ALWAYS_NEGATIVE_TYPES = new Set(["outbound", "transfer_out"]);
// Tipos que siempre suman stock (cantidad siempre positiva en DB).
const ALWAYS_POSITIVE_TYPES = new Set(["inbound", "return", "transfer_in"]);

function getMovementSign(m: InventoryMovement): { isNegative: boolean; display: number } {
  if (ALWAYS_NEGATIVE_TYPES.has(m.type)) {
    return { isNegative: true, display: Math.abs(m.quantity) };
  }
  if (ALWAYS_POSITIVE_TYPES.has(m.type)) {
    return { isNegative: false, display: Math.abs(m.quantity) };
  }
  // Para adjustment: desde migración 023 la quantity tiene signo.
  // Datos históricos (abs) se detectan via notes que contienen "(-N unidades)".
  if (m.type === "adjustment") {
    const isNegative =
      m.quantity < 0 || (m.notes?.includes("(-") ?? false);
    return { isNegative, display: Math.abs(m.quantity) };
  }
  return { isNegative: false, display: Math.abs(m.quantity) };
}

function BatchMovements({ detail }: { detail: BatchDetail }) {
  const recent = detail.movements.slice(0, 8);
  if (recent.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
        Movimientos recientes
      </h3>
      <div className="space-y-1">
        {recent.map((m) => {
          const { isNegative, display } = getMovementSign(m);
          return (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-md border border-slate-100 bg-white px-2 py-1.5 text-xs"
            >
              <div className="min-w-0">
                <p className="font-medium capitalize text-[#1E293B]">{m.type}</p>
                <p className="text-[10px] text-[#64748B]">{formatDateTime(m.created_at)}</p>
              </div>
              <div className="ml-2 shrink-0 text-right">
                <p
                  className={`font-semibold ${
                    isNegative ? "text-[#EF4444]" : "text-[#10B981]"
                  }`}
                >
                  {isNegative ? "-" : "+"}
                  {display}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EditMetadataDialog({
  open,
  onClose,
  detail,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  detail: BatchDetail;
  onSaved: () => void;
}) {
  const [supplier, setSupplier] = useState(detail.supplier ?? "");
  const [notes, setNotes] = useState(detail.notes ?? "");
  const [lotNumber, setLotNumber] = useState(detail.lot_number);
  const [expiresAt, setExpiresAt] = useState(
    detail.expires_at ? detail.expires_at.slice(0, 10) : ""
  );
  const [clearExpiration, setClearExpiration] = useState(detail.expires_at === null);
  const [suggestedPrice, setSuggestedPrice] = useState(
    detail.suggested_price !== null ? String(detail.suggested_price) : ""
  );
  const [quantityReceived, setQuantityReceived] = useState(String(detail.quantity_received));
  const [correctionReason, setCorrectionReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const parsedSuggested =
    suggestedPrice.trim().length > 0 ? Number(suggestedPrice) : null;
  const suggestedChanged = parsedSuggested !== detail.suggested_price;
  const clearSuggestedPrice =
    detail.suggested_price !== null && suggestedPrice.trim().length === 0;

  const parsedQty = Number.parseInt(quantityReceived, 10);
  const qtyChanged =
    Number.isFinite(parsedQty) && parsedQty !== detail.quantity_received;
  const minAllowedQty = detail.consumed_quantity;
  const qtyBelowConsumed = qtyChanged && parsedQty < minAllowedQty;
  const qtyDelta = qtyChanged ? parsedQty - detail.quantity_received : 0;

  const submitDisabled =
    isPending ||
    qtyBelowConsumed ||
    (qtyChanged && correctionReason.trim().length < 5) ||
    (suggestedChanged && parsedSuggested !== null && parsedSuggested < 0);

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const res = await updateBatch({
        lot_id: detail.id,
        supplier: supplier !== (detail.supplier ?? "") ? supplier : undefined,
        notes: notes !== (detail.notes ?? "") ? notes : undefined,
        lot_number: lotNumber !== detail.lot_number ? lotNumber : undefined,
        expires_at: clearExpiration ? undefined : expiresAt || undefined,
        clear_expiration: clearExpiration,
        suggested_price:
          suggestedChanged && parsedSuggested !== null ? parsedSuggested : undefined,
        clear_suggested_price: clearSuggestedPrice,
        quantity_received: qtyChanged ? parsedQty : undefined,
        correction_reason: qtyChanged ? correctionReason.trim() : undefined,
      });
      if (!res.success) {
        setError(res.error ?? "Error al actualizar el lote");
        return;
      }
      onSaved();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar lote</DialogTitle>
          <DialogDescription>
            El costo unitario no es modificable (rompe el COGS historico). Para corregir
            la cantidad recibida indica una razon.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="lot-number">Numero de lote</Label>
            <Input
              id="lot-number"
              value={lotNumber}
              onChange={(e) => setLotNumber(e.target.value)}
              maxLength={50}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="quantity-received">Cantidad recibida</Label>
            <Input
              id="quantity-received"
              type="number"
              min={Math.max(minAllowedQty, 1)}
              max={100000}
              value={quantityReceived}
              onChange={(e) => setQuantityReceived(e.target.value)}
            />
            <p className="text-xs text-[#64748B]">
              Consumido / asignado: {minAllowedQty} unidad(es). No puedes bajar de ese valor.
            </p>
            {qtyBelowConsumed && (
              <p className="text-xs font-medium text-[#EF4444]">
                La cantidad recibida no puede ser menor al consumido ({minAllowedQty}).
              </p>
            )}
            {qtyChanged && !qtyBelowConsumed && (
              <p className="text-xs text-[#F59E0B]">
                Ajustaras el restante en {qtyDelta > 0 ? "+" : ""}
                {qtyDelta} unidad(es) y se registrara un movimiento de tipo ajuste.
              </p>
            )}
          </div>

          {qtyChanged && (
            <div className="space-y-1">
              <Label htmlFor="correction-reason">Razon de la correccion *</Label>
              <Textarea
                id="correction-reason"
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder="Ej: error de digitacion al recibir, llegaron 2 cajas extra que no se contaron"
              />
              {correctionReason.trim().length > 0 && correctionReason.trim().length < 5 && (
                <p className="text-xs text-[#EF4444]">Minimo 5 caracteres</p>
              )}
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="suggested-price">Precio sugerido</Label>
            <Input
              id="suggested-price"
              type="number"
              min={0}
              step="0.01"
              value={suggestedPrice}
              onChange={(e) => setSuggestedPrice(e.target.value)}
              placeholder="Vacio = usar precio del producto"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="supplier">Proveedor</Label>
            <Input
              id="supplier"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              maxLength={100}
              placeholder="Opcional"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="expires-at">Vencimiento</Label>
            <Input
              id="expires-at"
              type="date"
              value={expiresAt}
              onChange={(e) => {
                setExpiresAt(e.target.value);
                if (e.target.value) setClearExpiration(false);
              }}
              disabled={clearExpiration}
            />
            <label className="flex items-center gap-2 text-xs text-[#64748B]">
              <input
                type="checkbox"
                checked={clearExpiration}
                onChange={(e) => setClearExpiration(e.target.checked)}
              />
              Producto no perecedero
            </label>
          </div>

          <div className="space-y-1">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>

          {error && (
            <p className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitDisabled}
            className="bg-[#1E3A5F] hover:bg-[#2d4f7a]"
          >
            {isPending ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LotShrinkageDialog({
  open,
  onClose,
  detail,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  detail: BatchDetail;
  onSaved: () => void;
}) {
  const [reason, setReason] = useState<"merma" | "muestra">("merma");
  const [quantity, setQuantity] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [notes, setNotes] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Reset al abrir/cerrar
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (open) {
      setReason("merma");
      setQuantity("");
      setCustomerId("");
      setNotes("");
      setError(null);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open]);

  function ensureCustomersLoaded() {
    if (customers.length > 0 || loadingCustomers) return;
    setLoadingCustomers(true);
    listCustomers().then((res) => {
      if (res.success && res.data) setCustomers(res.data);
      setLoadingCustomers(false);
    });
  }

  const parsedQty = Number.parseInt(quantity, 10);
  const validQty = Number.isFinite(parsedQty) && parsedQty > 0;
  const exceedsRemaining = validQty && parsedQty > detail.quantity_remaining;
  const submitDisabled =
    isPending ||
    !validQty ||
    exceedsRemaining ||
    (reason === "muestra" && !customerId);

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const res = await registerLotShrinkage({
        lot_id: detail.id,
        quantity: parsedQty,
        reason,
        customer_id: reason === "muestra" ? customerId : undefined,
        notes: notes.trim() || undefined,
      });
      if (!res.success) {
        setError(res.error ?? "Error al registrar la salida");
        return;
      }
      onSaved();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar merma / muestra del lote</DialogTitle>
          <DialogDescription>
            Esta salida descontara unidades especificamente de{" "}
            <span className="font-mono">{detail.lot_number}</span> sin pasar por FIFO.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            <span className="text-[#64748B]">Restante en el lote: </span>
            <span className="font-semibold text-[#1E293B]">
              {detail.quantity_remaining} unidad(es)
            </span>
          </div>

          <div className="space-y-1">
            <Label htmlFor="shrink-reason">Razon *</Label>
            <Select
              value={reason}
              onValueChange={(v) => {
                const next = v as "merma" | "muestra";
                setReason(next);
                if (next === "merma") setCustomerId("");
                if (next === "muestra") ensureCustomersLoaded();
              }}
              disabled={isPending}
            >
              <SelectTrigger id="shrink-reason">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="merma">Merma (perdida / deterioro)</SelectItem>
                <SelectItem value="muestra">Muestra a cliente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {reason === "muestra" && (
            <div className="space-y-1">
              <Label htmlFor="shrink-customer">Cliente *</Label>
              <CustomerCombobox
                id="shrink-customer"
                customers={customers}
                value={customerId}
                onChange={setCustomerId}
                disabled={isPending || loadingCustomers}
              />
              {loadingCustomers && (
                <p className="text-xs text-[#64748B]">Cargando clientes...</p>
              )}
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="shrink-quantity">Cantidad *</Label>
            <Input
              id="shrink-quantity"
              type="number"
              min={1}
              max={detail.quantity_remaining}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              disabled={isPending}
            />
            {exceedsRemaining && (
              <p className="text-xs font-medium text-[#EF4444]">
                Supera el restante del lote ({detail.quantity_remaining}).
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="shrink-notes">Notas</Label>
            <Textarea
              id="shrink-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder={
                reason === "merma"
                  ? "Ej: jugo derramado al recibir el lote"
                  : "Ej: muestra promocional entregada"
              }
            />
          </div>

          {error && (
            <p className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitDisabled}
            className="bg-[#F59E0B] text-white hover:bg-[#d97706]"
          >
            {isPending ? "Registrando..." : "Registrar salida"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
