"use server";

import { z } from "zod";
import { verifyAdmin } from "@/lib/auth-helpers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  reportFiltersSchema,
  type ActionResponse,
  type SalesByMonthReport,
} from "@/types";
import { logError, logOperacion } from "@/lib/logger";

// Filtros para el reporte de salidas manuales (mermas / muestras)
const outboundFiltersSchema = z.object({
  from: z.string().min(1, "Fecha 'from' requerida"),
  to: z.string().min(1, "Fecha 'to' requerida"),
  reason: z.enum(["merma", "muestra"]).optional(),
});

export interface OutboundMovementRow {
  id: string;
  created_at: string;
  product_id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  reason: "merma" | "muestra";
  customer_id: string | null;
  customer_name: string | null;
  notes: string | null;
  // Valor estimado = quantity * precio ACTUAL del producto.
  // Nota: no es costo histórico, es aproximación usando el precio vigente.
  estimated_value: number;
}

export interface OutboundReportData {
  mermas: OutboundMovementRow[];
  muestras: OutboundMovementRow[];
  totals: {
    mermas_quantity: number;
    mermas_value: number;
    muestras_quantity: number;
    muestras_value: number;
  };
}

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

// ============================================
// Reporte de salidas manuales (mermas / muestras)
// ============================================
// Devuelve movimientos tipo 'outbound' con reason IN ('merma','muestra')
// del admin actual, agrupados en dos secciones para la UI.
//
// Nota sobre estimated_value: se calcula como quantity * products.price
// usando el PRECIO ACTUAL del producto. No es costo histórico ni valor
// contable exacto; es una aproximación para dar una idea del impacto.
export async function getOutboundMovements(
  filters: unknown
): Promise<ActionResponse<OutboundReportData>> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const result = outboundFiltersSchema.safeParse(filters);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  const { from, to, reason } = result.data;

  // El input viene como "YYYY-MM-DD" (date input nativo). Tratamos el rango
  // como inclusivo en zona horaria de Colombia (UTC-5, sin DST):
  //   from → 00:00 hora Colombia → 05:00 UTC del mismo día
  //   to   → 00:00 hora Colombia del día SIGUIENTE → usamos lt() exclusivo
  // Así "hoy hasta hoy" incluye todo el día actual hasta las 23:59:59 locales.
  const fromUtc = `${from}T05:00:00.000Z`;
  const toDate = new Date(`${to}T00:00:00.000Z`);
  toDate.setUTCDate(toDate.getUTCDate() + 1);
  const toUtcExclusive = `${toDate.toISOString().slice(0, 10)}T05:00:00.000Z`;

  let query = ctx.supabase
    .from("inventory_movements")
    .select(`
      id,
      created_at,
      quantity,
      reason,
      notes,
      product_id,
      sample_customer_id,
      product:products!product_id(id, name, price),
      sample_customer:customers!sample_customer_id(id, name)
    `)
    .eq("admin_id", ctx.user.id)
    .eq("type", "outbound")
    .in("reason", ["merma", "muestra"])
    .gte("created_at", fromUtc)
    .lt("created_at", toUtcExclusive)
    .order("created_at", { ascending: false });

  if (reason) {
    query = query.eq("reason", reason);
  }

  const { data, error } = await query;

  if (error) {
    logError("get_outbound_movements", error);
    return { success: false, error: "Error al obtener salidas manuales" };
  }

  type ProductRow = { id: string; name: string; price: number } | null;
  type CustomerRow = { id: string; name: string } | null;
  type RawRow = {
    id: string;
    created_at: string;
    quantity: number;
    reason: "merma" | "muestra";
    notes: string | null;
    product_id: string;
    sample_customer_id: string | null;
    product: ProductRow;
    sample_customer: CustomerRow;
  };

  const rows = (data ?? []) as unknown as RawRow[];

  const mermas: OutboundMovementRow[] = [];
  const muestras: OutboundMovementRow[] = [];
  let mermasQty = 0;
  let mermasValue = 0;
  let muestrasQty = 0;
  let muestrasValue = 0;

  for (const row of rows) {
    const price = row.product?.price ?? 0;
    const estimated_value = row.quantity * price;
    const mapped: OutboundMovementRow = {
      id: row.id,
      created_at: row.created_at,
      product_id: row.product_id,
      product_name: row.product?.name ?? "(producto eliminado)",
      product_price: price,
      quantity: row.quantity,
      reason: row.reason,
      customer_id: row.sample_customer_id,
      customer_name: row.sample_customer?.name ?? null,
      notes: row.notes,
      estimated_value,
    };

    if (row.reason === "merma") {
      mermas.push(mapped);
      mermasQty += row.quantity;
      mermasValue += estimated_value;
    } else {
      muestras.push(mapped);
      muestrasQty += row.quantity;
      muestrasValue += estimated_value;
    }
  }

  logOperacion(
    "outbound_report_queried",
    { from, to, reason: reason ?? "all", count: rows.length },
    ctx.user.id
  );

  return {
    success: true,
    data: {
      mermas,
      muestras,
      totals: {
        mermas_quantity: mermasQty,
        mermas_value: mermasValue,
        muestras_quantity: muestrasQty,
        muestras_value: muestrasValue,
      },
    },
  };
}
