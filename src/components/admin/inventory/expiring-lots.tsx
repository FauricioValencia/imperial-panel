"use client";

import { AlertTriangle, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { ProductLot } from "@/types";

interface ExpiringLotsProps {
  lots: ProductLot[];
}

function daysUntil(date: string | null): number {
  if (!date) return Infinity;
  const diff = new Date(date).getTime() - Date.now();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function ExpiringLots({ lots }: ExpiringLotsProps) {
  const sorted = [...lots].sort(
    (a, b) => daysUntil(a.expires_at) - daysUntil(b.expires_at)
  );

  const expired = sorted.filter((l) => daysUntil(l.expires_at) < 0);
  const upcoming = sorted.filter((l) => daysUntil(l.expires_at) >= 0);

  if (sorted.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
        <Clock className="mx-auto mb-2 h-8 w-8 text-[#64748B]" />
        <p className="text-sm text-[#64748B]">No hay lotes próximos a vencer</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {expired.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-red-800">
            <AlertTriangle className="h-4 w-4" />
            {expired.length} lote{expired.length > 1 ? "s" : ""} vencido
            {expired.length > 1 ? "s" : ""} con stock pendiente
          </div>
          <p className="mt-1 text-xs text-red-700">
            Estos lotes están bloqueados para venta. Regístralos como merma o ajusta su vencimiento.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((lot) => {
          const days = daysUntil(lot.expires_at);
          const isExpired = days < 0;
          const isCritical = days >= 0 && days < 7;
          const tone = isExpired
            ? "border-red-300 bg-red-50"
            : isCritical
              ? "border-red-300 bg-red-50"
              : days < 15
                ? "border-amber-300 bg-amber-50"
                : "border-slate-200 bg-white";

          return (
            <div
              key={lot.id}
              className={`rounded-lg border ${tone} p-3 shadow-sm`}
            >
              <div className="flex items-baseline justify-between">
                <p className="font-mono text-xs text-[#64748B]">{lot.lot_number}</p>
                <span
                  className={`text-2xl font-bold ${
                    isExpired || isCritical
                      ? "text-red-700"
                      : days < 15
                        ? "text-amber-700"
                        : "text-[#1E293B]"
                  }`}
                >
                  {isExpired ? `${Math.abs(days)}d` : `${days}d`}
                </span>
              </div>
              <p className="mt-1 truncate font-medium text-[#1E293B]">
                {lot.product?.name ?? "—"}
              </p>
              <p className="text-xs text-[#64748B]">
                {isExpired ? "Vencido hace" : "Vence en"}{" "}
                {Math.abs(days)} día{Math.abs(days) === 1 ? "" : "s"}
              </p>
              <div className="mt-2 flex justify-between text-xs">
                <span className="text-[#64748B]">
                  {lot.quantity_remaining} unid.
                </span>
                <span className="font-medium text-[#1E293B]">
                  {formatCurrency(lot.unit_cost * lot.quantity_remaining)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
