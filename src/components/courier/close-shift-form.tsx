"use client";

import { useEffect, useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import {
  closeDailyShift,
  getMyInventory,
  getMyInventoryDetailed,
} from "@/actions/courier-warehouse";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CourierInventorySummary } from "@/types";

export function CloseShiftForm() {
  const [reportedTotal, setReportedTotal] = useState("");
  const [returns, setReturns] = useState<Record<string, string>>({});
  const [items, setItems] = useState<CourierInventorySummary[]>([]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    void (async () => {
      const res = await getMyInventory();
      if (res.success && res.data) setItems(res.data);
    })();
  }, []);

  const total = Number.parseFloat(reportedTotal);
  const validTotal = Number.isFinite(total) && total >= 0;

  const handleReturnAll = (productId: string, qty: number) => {
    setReturns((prev) => ({ ...prev, [productId]: String(qty) }));
  };

  const handleSubmit = () => {
    setError(null);
    if (!validTotal) {
      setError("Ingresa el total en caja reportado");
      return;
    }
    // El courier devuelve por producto agregado; necesitamos resolver a lotes
    // exactos (FIFO sobre los lotes de su bodega). Para MVP, llamamos al
    // backend que busca los lotes y construye las lineas.
    startTransition(async () => {
      // Por cada producto con returns > 0, distribuir entre lotes FIFO
      const linesByLot: { lot_id: string; product_id: string; quantity: number }[] = [];
      const detailRes = await getMyInventoryDetailed();
      if (!detailRes.success || !detailRes.data) {
        setError("Error al obtener detalle del stock móvil");
        return;
      }
      const detail = detailRes.data;
      const detailByProduct = new Map<
        string,
        { lot_id: string; product_id: string; quantity_remaining: number }[]
      >();
      for (const d of detail) {
        const arr = detailByProduct.get(d.product_id) ?? [];
        arr.push({
          lot_id: d.lot_id,
          product_id: d.product_id,
          quantity_remaining: d.quantity_remaining,
        });
        detailByProduct.set(d.product_id, arr);
      }

      for (const [productId, raw] of Object.entries(returns)) {
        const qty = Number.parseInt(raw, 10);
        if (!Number.isFinite(qty) || qty <= 0) continue;
        let remaining = qty;
        const lots = detailByProduct.get(productId) ?? [];
        for (const lot of lots) {
          if (remaining <= 0) break;
          const consume = Math.min(remaining, lot.quantity_remaining);
          linesByLot.push({ lot_id: lot.lot_id, product_id: productId, quantity: consume });
          remaining -= consume;
        }
        if (remaining > 0) {
          setError(`Devolves mas de lo que tienes para algun producto`);
          return;
        }
      }

      const res = await closeDailyShift({
        reported_total: total,
        returns: linesByLot,
        carryovers: [],
        notes: notes.trim() || undefined,
      });

      if (res.success) {
        setSuccess(true);
        setReportedTotal("");
        setReturns({});
        setNotes("");
      } else {
        setError(res.error ?? "Error al cerrar turno");
      }
    });
  };

  if (success) {
    return (
      <div className="rounded-lg border border-[#10B981] bg-[#ECFDF5] p-6 text-center">
        <CheckCircle2 className="mx-auto mb-2 h-10 w-10 text-[#047857]" />
        <p className="font-semibold text-[#065F46]">Turno cerrado</p>
        <p className="mt-1 text-sm text-[#047857]">
          La caja y el stock móvil quedaron registrados.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={() => setSuccess(false)}
        >
          Volver
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4">
        <Label htmlFor="reported-total" className="text-sm font-semibold text-[#1E293B]">
          Caja reportada (efectivo)
        </Label>
        <Input
          id="reported-total"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={reportedTotal}
          onChange={(e) => setReportedTotal(e.target.value)}
          disabled={isPending}
          className="min-h-12 text-lg"
          placeholder="0"
        />
        <p className="text-xs text-[#64748B]">
          El sistema comparara con los pagos del dia.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="mb-3 text-sm font-semibold text-[#1E293B]">
          Devolver stock móvil al central
        </p>
        {items.length === 0 ? (
          <p className="text-sm text-[#64748B]">No tienes stock móvil cargado.</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.product_id} className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm text-[#1E293B]">{item.product_name}</p>
                  <p className="text-xs text-[#94A3B8]">
                    Disponible: {item.total_units}
                  </p>
                </div>
                <Input
                  type="number"
                  min="0"
                  max={item.total_units}
                  placeholder="0"
                  value={returns[item.product_id] ?? ""}
                  onChange={(e) =>
                    setReturns((prev) => ({ ...prev, [item.product_id]: e.target.value }))
                  }
                  disabled={isPending}
                  className="w-20 min-h-12"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-12"
                  onClick={() => handleReturnAll(item.product_id, Number(item.total_units))}
                  disabled={isPending}
                >
                  Todo
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="close-notes">Notas</Label>
        <Textarea
          id="close-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={isPending}
          rows={2}
          placeholder="Observaciones del cierre..."
        />
      </div>

      <Button
        type="button"
        onClick={handleSubmit}
        disabled={isPending || !validTotal}
        className="w-full min-h-12 bg-[#10B981] hover:bg-[#059669] text-white"
      >
        {isPending ? "Cerrando..." : "Confirmar cierre"}
      </Button>
    </div>
  );
}

