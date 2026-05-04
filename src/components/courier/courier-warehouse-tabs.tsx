"use client";

import { useState } from "react";
import { Boxes, History, LogOut } from "lucide-react";
import { CourierStockList } from "./courier-stock-list";
import { CourierMovementsList } from "./courier-movements-list";
import { CloseShiftForm } from "./close-shift-form";
import type { CourierInventorySummary } from "@/types";

type TabId = "stock" | "history" | "close";

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

interface Props {
  initialInventory: CourierInventorySummary[];
  initialMovements: MovementRow[];
}

export function CourierWarehouseTabs({ initialInventory, initialMovements }: Props) {
  const [tab, setTab] = useState<TabId>("stock");

  const totalUnits = initialInventory.reduce((acc, i) => acc + Number(i.total_units), 0);
  const expiringSoonCount = initialInventory.filter((i) => i.has_expiring_soon).length;

  const tabs: Array<{ id: TabId; label: string; icon: React.ElementType; badge?: number }> = [
    { id: "stock", label: "Stock", icon: Boxes, badge: totalUnits || undefined },
    { id: "history", label: "Historial", icon: History },
    { id: "close", label: "Cerrar turno", icon: LogOut },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
        {tabs.map(({ id, label, icon: Icon, badge }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-md text-xs font-medium transition-colors ${
              tab === id ? "bg-white text-[#1E3A5F] shadow-sm" : "text-[#64748B]"
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
            {badge !== undefined && tab !== id && (
              <span className="absolute mt-6 ml-10 rounded-full bg-[#3B82F6] px-1 text-[9px] text-white">
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "stock" && (
        <CourierStockList items={initialInventory} expiringSoonCount={expiringSoonCount} />
      )}
      {tab === "history" && <CourierMovementsList movements={initialMovements} />}
      {tab === "close" && <CloseShiftForm />}
    </div>
  );
}
