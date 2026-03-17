"use server";

import { verifyAdmin } from "@/lib/auth-helpers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  reportFiltersSchema,
  type ActionResponse,
  type SalesByMonthReport,
} from "@/types";
import { logError } from "@/lib/logger";

export async function getSalesByMonth(
  filters: unknown
): Promise<ActionResponse<SalesByMonthReport[]>> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const result = reportFiltersSchema.safeParse(filters);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  const { courier_id, product_id, year, month } = result.data;

  // Construir query con joins
  // Agrupamos por domiciliario + mes + producto (si se filtra por producto)
  let query = ctx.supabase
    .from("orders")
    .select(`
      id,
      courier_id,
      courier:users!courier_id(id, name),
      delivered_at,
      total,
      items:order_items(
        quantity,
        unit_price,
        returned_quantity,
        product:products!product_id(id, name, codigo)
      )
    `)
    .eq("admin_id", ctx.user.id)
    .in("status", ["delivered", "partial"])
    .not("courier_id", "is", null)
    .not("delivered_at", "is", null);

  // Filtro de año
  query = query
    .gte("delivered_at", `${year}-01-01T00:00:00.000Z`)
    .lte("delivered_at", `${year}-12-31T23:59:59.999Z`);

  // Filtro de mes (opcional)
  if (month) {
    const monthStr = String(month).padStart(2, "0");
    const daysInMonth = new Date(year, month, 0).getDate();
    query = query
      .gte("delivered_at", `${year}-${monthStr}-01T00:00:00.000Z`)
      .lte("delivered_at", `${year}-${monthStr}-${daysInMonth}T23:59:59.999Z`);
  }

  // Filtro de domiciliario (opcional)
  if (courier_id) {
    query = query.eq("courier_id", courier_id);
  }

  const { data: orders, error } = await query;

  if (error) {
    logError("get_sales_by_month", error);
    return { success: false, error: "Error al obtener reporte" };
  }

  // Agregar resultados en memoria (más flexible que GROUP BY en supabase client)
  type ReportKey = string;

  // Acumulador interno con Set de IDs para contar pedidos únicos por grupo
  interface ReportAccumulator extends SalesByMonthReport {
    _orderIds: Set<string>;
  }

  const map = new Map<ReportKey, ReportAccumulator>();

  type CourierRow = { id: string; name: string };
  type ItemRow = {
    quantity: number;
    unit_price: number;
    returned_quantity: number;
    product: { id: string; name: string; codigo: string | null } | null;
  };

  for (const order of orders ?? []) {
    if (!order.courier_id || !order.delivered_at) continue;

    const courier = (order.courier as unknown as CourierRow) ?? null;
    if (!courier) continue;

    const deliveredAt = new Date(order.delivered_at);
    const orderYear = deliveredAt.getFullYear();
    const orderMonth = deliveredAt.getMonth() + 1;

    for (const item of ((order.items as unknown as ItemRow[]) ?? [])) {
      if (!item.product) continue;

      // Si hay filtro de producto, solo incluir ese producto
      if (product_id && item.product.id !== product_id) continue;

      const deliveredQty = item.quantity - (item.returned_quantity ?? 0);
      if (deliveredQty <= 0) continue;

      // Clave: domiciliario + año + mes + producto (si se filtra por producto)
      const key: ReportKey = product_id
        ? `${courier.id}|${orderYear}|${orderMonth}|${item.product.id}`
        : `${courier.id}|${orderYear}|${orderMonth}|all`;

      const existing = map.get(key);
      const itemAmount = deliveredQty * item.unit_price;

      if (existing) {
        // Solo contar el pedido una vez por grupo, aunque tenga múltiples ítems
        if (!existing._orderIds.has(order.id as string)) {
          existing._orderIds.add(order.id as string);
          existing.total_orders += 1;
        }
        existing.total_items += deliveredQty;
        existing.total_amount += itemAmount;
      } else {
        map.set(key, {
          courier_id: courier.id,
          courier_name: courier.name,
          year: orderYear,
          month: orderMonth,
          product_id: product_id ? item.product.id : null,
          product_name: product_id ? item.product.name : null,
          product_codigo: product_id ? item.product.codigo : null,
          total_orders: 1,
          total_items: deliveredQty,
          total_amount: itemAmount,
          _orderIds: new Set([order.id as string]),
        });
      }
    }
  }

  const reportData = Array.from(map.values())
    .sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      if (a.month !== b.month) return b.month - a.month;
      return a.courier_name.localeCompare(b.courier_name);
    })
    // Eliminar campo interno antes de serializar
    .map(({ _orderIds: _internal, ...row }) => row);

  return { success: true, data: reportData };
}

// Función auxiliar para el portal del domiciliario (sus propias estadísticas)
// Recibe courierId para evitar un segundo fetch al llamarse desde una página que ya tiene el usuario
export async function getMyCourierStats(filters: {
  courierId: string;
  year: number;
  month?: number;
}) {
  const supabase = await createServerSupabaseClient();
  const { courierId, year, month } = filters;

  const monthStr = month ? String(month).padStart(2, "0") : "01";
  const daysInMonth = month ? new Date(year, month, 0).getDate() : 31;
  const dateFrom = month
    ? `${year}-${monthStr}-01T00:00:00.000Z`
    : `${year}-01-01T00:00:00.000Z`;
  const dateTo = month
    ? `${year}-${monthStr}-${daysInMonth}T23:59:59.999Z`
    : `${year}-12-31T23:59:59.999Z`;

  const { data: orders, error } = await supabase
    .from("orders")
    .select(`
      id,
      total,
      status,
      delivered_at,
      customer:customers!customer_id(name),
      items:order_items(
        quantity,
        returned_quantity,
        unit_price,
        product:products!product_id(name, codigo)
      )
    `)
    .eq("courier_id", courierId)
    .in("status", ["delivered", "partial"])
    .gte("delivered_at", dateFrom)
    .lte("delivered_at", dateTo)
    .order("delivered_at", { ascending: false });

  if (error) {
    return { success: false, error: "Error al obtener estadísticas" };
  }

  type OrderRow = { id: string; total: number; status: string; delivered_at: string | null };
  const typedOrders = (orders ?? []) as unknown as OrderRow[];
  const totalOrders = typedOrders.length;
  const totalAmount = typedOrders.reduce((sum: number, o: OrderRow) => sum + (o.total ?? 0), 0);

  return {
    success: true,
    data: {
      orders: typedOrders,
      total_orders: totalOrders,
      total_amount: totalAmount,
    },
  };
}
