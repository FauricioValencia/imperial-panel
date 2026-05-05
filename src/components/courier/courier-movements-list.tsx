"use client";

import { ArrowDown, ArrowUp, RotateCcw, Sliders } from "lucide-react";

interface MovementRow {
  id: string;
  type: string;
  quantity: number;
  product_id: string;
  product_name: string;
  lot_id: string | null;
  created_at: string;
  notes: string | null;
}

const labels: Record<string, { label: string; sign: "+" | "-" | "·"; icon: React.ElementType; color: string }> = {
  transfer_in: { label: "Recibido", sign: "+", icon: ArrowDown, color: "text-[#047857]" },
  transfer_out: { label: "Devuelto al admin", sign: "-", icon: ArrowUp, color: "text-[#64748B]" },
  outbound: { label: "Entregado", sign: "-", icon: ArrowUp, color: "text-[#3B82F6]" },
  return: { label: "Devuelto por cliente", sign: "+", icon: RotateCcw, color: "text-[#92400E]" },
  adjustment: { label: "Ajuste", sign: "·", icon: Sliders, color: "text-[#64748B]" },
  inbound: { label: "Entrada", sign: "+", icon: ArrowDown, color: "text-[#047857]" },
};

function groupByDay(movements: MovementRow[]): Map<string, MovementRow[]> {
  const map = new Map<string, MovementRow[]>();
  for (const m of movements) {
    const day = new Date(m.created_at).toLocaleDateString("es-CO", {
      day: "numeric",
      month: "long",
    });
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(m);
  }
  return map;
}

export function CourierMovementsList({ movements }: { movements: MovementRow[] }) {
  if (movements.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-[#64748B]">
        Aun no hay movimientos en tu stock móvil.
      </div>
    );
  }

  const grouped = groupByDay(movements);

  return (
    <div className="space-y-3">
      {Array.from(grouped.entries()).map(([day, items]) => (
        <div key={day}>
          <p className="sticky top-14 z-10 bg-slate-50 py-1 text-xs font-semibold uppercase text-[#64748B]">
            {day}
          </p>
          <div className="space-y-1">
            {items.map((m) => {
              const meta = labels[m.type] ?? { label: m.type, sign: "·" as const, icon: Sliders, color: "text-[#64748B]" };
              const Icon = meta.icon;
              return (
                <div
                  key={m.id}
                  className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3"
                >
                  <div className={`mt-0.5 ${meta.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#1E293B]">
                      {meta.sign}
                      {m.quantity} {m.product_name}
                    </p>
                    <p className="text-xs text-[#94A3B8]">
                      {meta.label}
                      {m.notes && ` · ${m.notes}`}
                    </p>
                  </div>
                  <p className="text-xs text-[#94A3B8]">
                    {new Date(m.created_at).toLocaleTimeString("es-CO", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
