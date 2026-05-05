"use client";

import { useMemo, useState } from "react";
import { Package, Layers, Clock, Truck } from "lucide-react";
import { ProductsTable } from "./products-table";
import { LotsTable } from "./lots-table";
import { ExpiringLots } from "./expiring-lots";
import { CourierWarehousePanel } from "./courier-warehouse-panel";
import type { Customer, ListLotsResult, Product, ProductLot } from "@/types";

interface CourierSummaryRow {
  courier_id: string;
  courier_name: string;
  total_units: number;
  products_count: number;
}

interface InventoryTabsProps {
  products: Product[];
  initialLots: ListLotsResult;
  expiringLots: ProductLot[];
  customers: Customer[];
  initialCouriersInventory: CourierSummaryRow[];
}

type TabId = "products" | "lots" | "expiring" | "couriers";

function daysUntil(date: string | null): number {
  if (!date) return Infinity;
  return Math.floor((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function InventoryTabs({
  products,
  initialLots,
  expiringLots,
  customers,
  initialCouriersInventory,
}: InventoryTabsProps) {
  const [tab, setTab] = useState<TabId>("products");

  const criticalCount = useMemo(
    () => expiringLots.filter((l) => daysUntil(l.expires_at) < 7).length,
    [expiringLots]
  );

  const tabs: Array<{ id: TabId; label: string; icon: React.ElementType; badge?: number }> = [
    { id: "products", label: "Productos", icon: Package },
    { id: "lots", label: "Lotes", icon: Layers },
    { id: "expiring", label: "Por vencer", icon: Clock, badge: criticalCount || undefined },
    { id: "couriers", label: "Stock móvil", icon: Truck },
  ];

  return (
    <div className="space-y-4">
      <div className="flex border-b border-slate-200">
        {tabs.map(({ id, label, icon: Icon, badge }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === id
                ? "border-[#1E3A5F] text-[#1E3A5F]"
                : "border-transparent text-[#64748B] hover:text-[#1E293B]"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
            {badge !== undefined && (
              <span className="rounded-full bg-[#EF4444] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "products" && (
        <ProductsTable initialProducts={products} customers={customers} />
      )}
      {tab === "lots" && <LotsTable initialResult={initialLots} products={products} />}
      {tab === "expiring" && <ExpiringLots lots={expiringLots} />}
      {tab === "couriers" && (
        <CourierWarehousePanel
          initialCouriers={initialCouriersInventory}
          products={products}
        />
      )}
    </div>
  );
}
