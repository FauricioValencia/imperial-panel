"use server";

import { verifyAdmin } from "@/lib/auth-helpers";
import { type ActionResponse } from "@/types";
import { logError } from "@/lib/logger";

interface DashboardMetrics {
  orders_today: number;
  orders_pending: number;
  pending_balance: number;
  active_couriers: number;
  low_stock_count: number;
  deliveries_today: number;
}

export async function getDashboardMetrics(): Promise<ActionResponse<DashboardMetrics>> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  // Run all queries in parallel
  const [
    ordersToday,
    ordersPending,
    pendingBalance,
    activeCouriers,
    lowStock,
    deliveriesToday,
  ] = await Promise.all([
    // Orders created today
    ctx.supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayISO),

    // Pending/assigned/in_transit orders
    ctx.supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "assigned", "in_transit"]),

    // Total pending balance
    ctx.supabase
      .from("customers")
      .select("pending_balance")
      .eq("active", true)
      .gt("pending_balance", 0),

    // Active couriers (only this admin's couriers)
    ctx.supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("role", "courier")
      .eq("active", true)
      .eq("admin_id", ctx.user.id),

    // Products with low stock
    ctx.supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("active", true)
      .filter("stock", "lte", "min_stock"),

    // Deliveries completed today
    ctx.supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .in("status", ["delivered", "partial"])
      .gte("delivered_at", todayISO),
  ]);

  const totalBalance = (pendingBalance.data || []).reduce(
    (sum: number, c: { pending_balance: number }) => sum + c.pending_balance, 0
  );

  return {
    success: true,
    data: {
      orders_today: ordersToday.count ?? 0,
      orders_pending: ordersPending.count ?? 0,
      pending_balance: totalBalance,
      active_couriers: activeCouriers.count ?? 0,
      low_stock_count: lowStock.count ?? 0,
      deliveries_today: deliveriesToday.count ?? 0,
    },
  };
}

interface RecentOrder {
  id: string;
  total: number;
  status: string;
  created_at: string;
  customer: { name: string } | null;
}

export async function getRecentOrders(): Promise<ActionResponse<RecentOrder[]>> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const { data, error } = await ctx.supabase
    .from("orders")
    .select("id, total, status, created_at, customer:customers!customer_id(name)")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    logError("get_recent_orders", error);
    return { success: false, error: "Error fetching orders" };
  }

  const mapped: RecentOrder[] = (data ?? []).map((row) => ({
    id: row.id,
    total: row.total,
    status: row.status,
    created_at: row.created_at,
    customer: Array.isArray(row.customer) ? row.customer[0] ?? null : row.customer,
  }));

  return { success: true, data: mapped };
}

interface TopDebtor {
  id: string;
  name: string;
  pending_balance: number;
}

export async function getTopDebtors(): Promise<ActionResponse<TopDebtor[]>> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const { data, error } = await ctx.supabase
    .from("customers")
    .select("id, name, pending_balance")
    .eq("active", true)
    .gt("pending_balance", 0)
    .order("pending_balance", { ascending: false })
    .limit(5);

  if (error) {
    logError("get_top_debtors", error);
    return { success: false, error: "Error fetching debtors" };
  }

  return { success: true, data: data as TopDebtor[] };
}
