"use client";

import { AlertTriangle, Package } from "lucide-react";
import type { CourierInventorySummary } from "@/types";

interface Props {
  items: CourierInventorySummary[];
  expiringSoonCount: number;
}

function formatExpiry(date: string | null): string {
  if (!date) return "Sin vencimiento";
  return new Date(date).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
  });
}

export function CourierStockList({ items, expiringSoonCount }: Props) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
        <Package className="mx-auto mb-3 h-10 w-10 text-[#94A3B8]" />
        <p className="text-sm text-[#64748B]">Tu stock móvil esta vacio.</p>
        <p className="mt-1 text-xs text-[#94A3B8]">
          Pidele al admin que cargue productos para cambios en sitio.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {expiringSoonCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-[#F59E0B] bg-[#FEF3C7] p-3 text-sm text-[#92400E]">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>
            {expiringSoonCount} producto{expiringSoonCount > 1 ? "s" : ""} con vencimiento proximo
          </span>
        </div>
      )}

      {items.map((item) => (
        <div
          key={item.product_id}
          className="rounded-lg border border-slate-200 bg-white p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="font-medium text-[#1E293B]">{item.product_name}</p>
              {item.product_code && (
                <p className="text-xs text-[#94A3B8]">Codigo: {item.product_code}</p>
              )}
              <p className="mt-1 text-xs text-[#64748B]">
                {item.lots_count} lote{item.lots_count > 1 ? "s" : ""}
                {item.earliest_expiry && (
                  <>
                    {" · "}
                    <span className={item.has_expiring_soon ? "text-[#B91C1C]" : ""}>
                      Vence: {formatExpiry(item.earliest_expiry)}
                    </span>
                  </>
                )}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-[#1E293B]">{item.total_units}</p>
              <p className="text-xs text-[#94A3B8]">
                unidad{Number(item.total_units) === 1 ? "" : "es"}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
