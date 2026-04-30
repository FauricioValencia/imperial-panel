"use client";

import { useEffect, useState, useTransition } from "react";
import { Package, Calendar, Truck, AlertTriangle, X, Save, Lock } from "lucide-react";
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
import { closeBatch, getBatch, updateBatch } from "@/actions/inventory";
import { formatCurrency } from "@/lib/format";
import type { BatchDetail } from "@/types";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!lotId) {
      setDetail(null);
      setError(null);
      setEditing(false);
      setClosing(false);
      return;
    }
    setLoading(true);
    setError(null);
    getBatch(lotId).then((res) => {
      if (res.success && res.data) {
        setDetail(res.data);
      } else {
        setError(res.error ?? "Error al cargar el lote");
      }
      setLoading(false);
    });
  }, [lotId]);

  function refresh() {
    if (!lotId) return;
    getBatch(lotId).then((res) => {
      if (res.success && res.data) setDetail(res.data);
    });
  }

  return (
    <Sheet open={!!lotId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="text-[#1E3A5F]">Detalle del Lote</SheetTitle>
          <SheetDescription>
            Trazabilidad completa: stock, costo, asignaciones y movimientos.
          </SheetDescription>
        </SheetHeader>

        {loading && <DrawerSkeleton />}

        {error && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {detail && !loading && (
          <div className="mt-4 space-y-5">
            <BatchHeader detail={detail} />

            <Separator />

            <BatchInventory detail={detail} />

            <Separator />

            <BatchCost detail={detail} />

            <Separator />

            <BatchMetadata detail={detail} />

            <Separator />

            <BatchAllocations detail={detail} />

            <Separator />

            <BatchMovements detail={detail} />

            <Separator />

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              {detail.active && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditing(true)}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Editar metadatos
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setClosing(true)}
                  >
                    <Lock className="mr-2 h-4 w-4" />
                    Cerrar lote
                  </Button>
                </>
              )}
            </div>
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
          <CloseBatchDialog
            open={closing}
            onClose={() => setClosing(false)}
            detail={detail}
            onClosed={() => {
              setClosing(false);
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
        <div>
          <p className="font-mono text-sm text-[#1E3A5F]">{detail.lot_number}</p>
          <p className="text-base font-semibold text-[#1E293B]">{detail.product.name}</p>
          {detail.product.codigo && (
            <p className="font-mono text-xs text-[#64748B]">{detail.product.codigo}</p>
          )}
        </div>
        <Badge className={st.className}>{st.label}</Badge>
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

function BatchCost({ detail }: { detail: BatchDetail }) {
  const totalInvestment = detail.unit_cost * detail.quantity_received;
  const remainingValue = detail.unit_cost * detail.quantity_remaining;

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Costo</h3>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-[#64748B]">Costo unitario</p>
          <p className="font-semibold text-[#1E293B]">
            {formatCurrency(detail.unit_cost)}
            {detail.is_estimated_cost && (
              <span className="ml-1 text-[10px] text-[#F59E0B]">(estimado)</span>
            )}
          </p>
        </div>
        <div>
          <p className="text-[#64748B]">Precio venta</p>
          <p className="font-semibold text-[#1E293B]">{formatCurrency(detail.product.price)}</p>
        </div>
        <div>
          <p className="text-[#64748B]">Inversion total</p>
          <p className="font-semibold text-[#1E293B]">{formatCurrency(totalInvestment)}</p>
        </div>
        <div>
          <p className="text-[#64748B]">Valor vigente</p>
          <p className="font-semibold text-[#10B981]">{formatCurrency(remainingValue)}</p>
        </div>
      </div>
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
        {recent.map((m) => (
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
                  m.type === "outbound" ? "text-[#EF4444]" : "text-[#10B981]"
                }`}
              >
                {m.type === "outbound" ? "-" : "+"}
                {m.quantity}
              </p>
            </div>
          </div>
        ))}
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
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar metadatos del lote</DialogTitle>
          <DialogDescription>
            Solo se pueden editar datos descriptivos. El costo unitario y la cantidad
            no son modificables.
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
            disabled={isPending}
            className="bg-[#1E3A5F] hover:bg-[#2d4f7a]"
          >
            {isPending ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CloseBatchDialog({
  open,
  onClose,
  detail,
  onClosed,
}: {
  open: boolean;
  onClose: () => void;
  detail: BatchDetail;
  onClosed: () => void;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const hasActive = detail.total_allocated_active > 0;

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const res = await closeBatch({
        lot_id: detail.id,
        force: hasActive,
        reason: reason.trim() || undefined,
      });
      if (!res.success) {
        setError(res.error ?? "Error al cerrar el lote");
        return;
      }
      onClosed();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cerrar lote {detail.lot_number}</DialogTitle>
          <DialogDescription>
            El lote quedara inactivo y dejara de asignarse en nuevos pedidos.
            Las {detail.quantity_remaining} unidades restantes ya no podran venderse.
          </DialogDescription>
        </DialogHeader>

        {hasActive && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="flex items-center gap-2 font-medium">
              <AlertTriangle className="h-4 w-4" />
              Cierre forzado
            </p>
            <p className="mt-1">
              Este lote tiene <strong>{detail.total_allocated_active}</strong> unidad(es)
              asignada(s) en pedidos activos. El cierre no las cancelara, pero requiere
              que indiques una razon.
            </p>
          </div>
        )}

        <div className="space-y-1">
          <Label htmlFor="close-reason">
            Razon{hasActive ? " *" : " (opcional)"}
          </Label>
          <Textarea
            id="close-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Ej: Lote con defecto detectado por cliente"
          />
        </div>

        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={isPending || (hasActive && reason.trim().length === 0)}
          >
            {isPending ? "Cerrando..." : "Cerrar lote"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
