"use client";

import { useEffect, useState, useTransition } from "react";
import { ChevronDown, ChevronRight, Truck, ArrowDownToLine, AlertTriangle } from "lucide-react";
import {
  getCourierInventory,
  getCourierInventoryDetailed,
  listPendingAdjustments,
  resolvePendingAdjustment,
  type CourierInventoryDetailRow,
} from "@/actions/courier-warehouse";
import { Button } from "@/components/ui/button";
import { TransferStockDialog } from "./transfer-stock-dialog";
import { ReturnCourierStockDialog } from "./return-courier-stock-dialog";
import type {
  CourierInventorySummary,
  PendingAdjustment,
  Product,
} from "@/types";

interface CourierSummaryRow {
  courier_id: string;
  courier_name: string;
  total_units: number;
  products_count: number;
}

interface CourierWarehousePanelProps {
  initialCouriers: CourierSummaryRow[];
  products: Product[];
}

export function CourierWarehousePanel({
  initialCouriers,
  products,
}: CourierWarehousePanelProps) {
  const [couriers, setCouriers] = useState(initialCouriers);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [inventoryByCourier, setInventoryByCourier] = useState<
    Record<string, CourierInventorySummary[]>
  >({});
  const [detailByCourier, setDetailByCourier] = useState<
    Record<string, CourierInventoryDetailRow[]>
  >({});
  const [transferOpen, setTransferOpen] = useState<{ id: string; name: string } | null>(null);
  const [returnOpen, setReturnOpen] = useState<{ id: string; name: string } | null>(null);
  const [pending, setPending] = useState<PendingAdjustment[]>([]);
  const [resolving, startResolve] = useTransition();

  useEffect(() => {
    void (async () => {
      const res = await listPendingAdjustments();
      if (res.success && res.data) setPending(res.data);
    })();
  }, []);

  const refreshCourier = async (courierId: string) => {
    const [summary, detail] = await Promise.all([
      getCourierInventory(courierId),
      getCourierInventoryDetailed(courierId),
    ]);
    if (summary.success && summary.data) {
      setInventoryByCourier((prev) => ({ ...prev, [courierId]: summary.data ?? [] }));
    }
    if (detail.success && detail.data) {
      setDetailByCourier((prev) => ({ ...prev, [courierId]: detail.data ?? [] }));
    }
    // Refrescar totales del courier en la lista
    const totals = (summary.data ?? []).reduce(
      (acc, item) => {
        acc.total += Number(item.total_units);
        acc.products.add(item.product_id);
        return acc;
      },
      { total: 0, products: new Set<string>() }
    );
    setCouriers((prev) =>
      prev.map((c) =>
        c.courier_id === courierId
          ? { ...c, total_units: totals.total, products_count: totals.products.size }
          : c
      )
    );
  };

  const toggle = (courierId: string) => {
    if (expanded === courierId) {
      setExpanded(null);
      return;
    }
    setExpanded(courierId);
    if (!inventoryByCourier[courierId]) {
      void refreshCourier(courierId);
    }
  };

  const handleResolve = (adjustmentId: string) => {
    const note = window.prompt("Resolucion (mínimo 5 caracteres)");
    if (!note || note.trim().length < 5) return;
    startResolve(async () => {
      const res = await resolvePendingAdjustment({
        adjustment_id: adjustmentId,
        resolution_note: note.trim(),
      });
      if (res.success) {
        setPending((prev) => prev.filter((p) => p.id !== adjustmentId));
      }
    });
  };

  return (
    <div className="space-y-4">
      {pending.length > 0 && (
        <div className="rounded-lg border border-[#F59E0B] bg-[#FEF3C7] p-4">
          <div className="mb-2 flex items-center gap-2 text-[#92400E]">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-semibold">
              {pending.length} ajuste{pending.length > 1 ? "s" : ""} pendiente{pending.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="space-y-2">
            {pending.map((adj) => (
              <div
                key={adj.id}
                className="flex items-center justify-between rounded border border-amber-200 bg-white p-2 text-sm"
              >
                <div>
                  <p className="font-medium text-[#1E293B]">
                    {adj.courier?.name ?? "Courier"} · {adj.product?.name ?? "Producto"}
                  </p>
                  <p className="text-xs text-[#64748B]">
                    {adj.quantity} unidad(es) · {adj.reason}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleResolve(adj.id)}
                  disabled={resolving}
                >
                  Resolver
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {couriers.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-[#64748B]">
          No hay couriers activos. Crea uno desde la seccion de couriers.
        </div>
      ) : (
        <div className="space-y-2">
          {couriers.map((c) => {
            const isOpen = expanded === c.courier_id;
            const inventory = inventoryByCourier[c.courier_id] ?? [];
            const detail = detailByCourier[c.courier_id] ?? [];
            return (
              <div
                key={c.courier_id}
                className="rounded-lg border border-slate-200 bg-white"
              >
                <div className="flex items-center justify-between p-4">
                  <button
                    type="button"
                    onClick={() => toggle(c.courier_id)}
                    className="flex flex-1 items-center gap-3 text-left"
                  >
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 text-[#64748B]" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-[#64748B]" />
                    )}
                    <div>
                      <p className="font-medium text-[#1E293B]">{c.courier_name}</p>
                      <p className="text-xs text-[#64748B]">
                        {c.total_units} unidad(es) · {c.products_count} producto(s)
                      </p>
                    </div>
                  </button>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setTransferOpen({ id: c.courier_id, name: c.courier_name })
                      }
                    >
                      <Truck className="mr-1 h-4 w-4" /> Transferir
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setReturnOpen({ id: c.courier_id, name: c.courier_name });
                        if (!detailByCourier[c.courier_id]) {
                          void refreshCourier(c.courier_id);
                        }
                      }}
                      disabled={c.total_units === 0}
                    >
                      <ArrowDownToLine className="mr-1 h-4 w-4" /> Devolver
                    </Button>
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-slate-200 bg-slate-50 p-4">
                    {inventory.length === 0 ? (
                      <p className="text-sm text-[#64748B]">
                        Sin stock móvil cargado.
                      </p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 text-left text-xs text-[#64748B]">
                            <th className="pb-2 font-medium">Producto</th>
                            <th className="pb-2 font-medium text-right">Unidades</th>
                            <th className="pb-2 font-medium text-right">Lotes</th>
                            <th className="pb-2 font-medium text-right">Vencimiento prox.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inventory.map((it) => (
                            <tr key={it.product_id} className="border-b border-slate-100">
                              <td className="py-2 text-[#1E293B]">{it.product_name}</td>
                              <td className="py-2 text-right font-medium">{it.total_units}</td>
                              <td className="py-2 text-right text-[#64748B]">{it.lots_count}</td>
                              <td className="py-2 text-right text-[#64748B]">
                                {it.earliest_expiry
                                  ? new Date(it.earliest_expiry).toLocaleDateString("es-CO")
                                  : "—"}
                                {it.has_expiring_soon && (
                                  <span className="ml-1 rounded bg-[#FEF3C7] px-1 text-xs text-[#92400E]">
                                    !
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {transferOpen && (
        <TransferStockDialog
          open={!!transferOpen}
          onClose={() => setTransferOpen(null)}
          onSuccess={() => transferOpen && void refreshCourier(transferOpen.id)}
          courierId={transferOpen.id}
          courierName={transferOpen.name}
          products={products}
        />
      )}

      {returnOpen && (
        <ReturnCourierStockDialog
          open={!!returnOpen}
          onClose={() => setReturnOpen(null)}
          onSuccess={() => returnOpen && void refreshCourier(returnOpen.id)}
          courierId={returnOpen.id}
          courierName={returnOpen.name}
          detailedItems={(detailByCourier[returnOpen.id] ?? []).map((d) => ({
            lot_id: d.lot_id,
            product_id: d.product_id,
            product_name: `${d.product_name}${d.lot_number ? ` · ${d.lot_number}` : ""}`,
            quantity_remaining: d.quantity_remaining,
          }))}
        />
      )}
    </div>
  );
}
