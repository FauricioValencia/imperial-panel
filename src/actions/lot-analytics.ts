"use server";

import { verifyAdmin } from "@/lib/auth-helpers";
import {
  type ActionResponse,
  type LotProfitabilityRow,
  type InventoryValuationRow,
  type MonthlyCogsRow,
} from "@/types";
import { logError, logOperacion } from "@/lib/logger";

// Periodo de exportacion: rango cerrado [from, to] en formato YYYY-MM-DD.
// Si solo se da `month` (YYYY-MM) se interpreta como mes completo.
export interface ExportPeriod {
  from?: string;
  to?: string;
  month?: string;
}

function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  // RFC 4180: si contiene comillas, comas o saltos, envolver en " y duplicar comillas
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function resolveRange(period: ExportPeriod): { from: string; to: string } | null {
  if (period.month && /^\d{4}-\d{2}$/.test(period.month)) {
    const [year, monthStr] = period.month.split("-");
    const y = Number(year);
    const m = Number(monthStr);
    const from = `${period.month}-01`;
    // Primer dia del mes siguiente como limite superior exclusivo, pero el
    // filtro lo aplicamos como `<` no `<=` para incluir todo el mes.
    const nextMonth = m === 12 ? 1 : m + 1;
    const nextYear = m === 12 ? y + 1 : y;
    const to = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
    return { from, to };
  }
  if (period.from && period.to) {
    return { from: period.from, to: period.to };
  }
  return null;
}

/**
 * Margen real por allocation de un lote especifico. Solo incluye
 * allocations en ordenes 'delivered' o 'partial' (la vista ya filtra).
 * Una venta multi-lote produce N filas (una por lote consumido).
 */
export async function getLotProfitability(
  lotId: string
): Promise<ActionResponse<LotProfitabilityRow[]>> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const { data, error } = await ctx.supabase
    .from("lot_profitability_view")
    .select("*")
    .eq("lot_id", lotId)
    .order("allocated_at", { ascending: false });

  if (error) {
    logError("get_lot_profitability", error, { lot_id: lotId });
    return { success: false, error: "Error al consultar rentabilidad del lote" };
  }

  return { success: true, data: data as LotProfitabilityRow[] };
}

/**
 * Costo Promedio Ponderado (CPP) y valor de inventario vigente para un
 * producto. Excluye lotes vencidos, agotados e inactivos. Devuelve null
 * en data si el producto no tiene lotes vigentes.
 */
export async function getProductCPP(
  productId: string
): Promise<ActionResponse<InventoryValuationRow | null>> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const { data, error } = await ctx.supabase
    .from("current_inventory_valuation")
    .select("*")
    .eq("product_id", productId)
    .maybeSingle();

  if (error) {
    logError("get_product_cpp", error, { product_id: productId });
    return { success: false, error: "Error al consultar costo promedio" };
  }

  return { success: true, data: data as InventoryValuationRow | null };
}

/**
 * Valoracion completa del inventario vigente del admin: CPP, valor total
 * y cantidad por producto. Util para reportes contables y dashboards.
 */
export async function getInventoryValuation(): Promise<
  ActionResponse<InventoryValuationRow[]>
> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const { data, error } = await ctx.supabase
    .from("current_inventory_valuation")
    .select("*")
    .order("total_inventory_value", { ascending: false });

  if (error) {
    logError("get_inventory_valuation", error);
    return { success: false, error: "Error al consultar valoracion del inventario" };
  }

  return { success: true, data: data as InventoryValuationRow[] };
}

/**
 * COGS y revenue por producto y mes. Si se da `from`/`to`, filtra el
 * rango (cerrado-abierto: from <= month < to). Si no, devuelve todo el
 * historico del admin.
 */
export async function getMonthlyCogs(
  period?: ExportPeriod
): Promise<ActionResponse<MonthlyCogsRow[]>> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  let query = ctx.supabase
    .from("monthly_cogs_by_product")
    .select("*")
    .order("month", { ascending: false })
    .order("total_revenue", { ascending: false });

  if (period) {
    const range = resolveRange(period);
    if (range) {
      query = query.gte("month", range.from).lt("month", range.to);
    }
  }

  const { data, error } = await query;

  if (error) {
    logError("get_monthly_cogs", error, { period });
    return { success: false, error: "Error al consultar COGS mensual" };
  }

  return { success: true, data: data as MonthlyCogsRow[] };
}

/**
 * Exporta lot_profitability_view filtrado por periodo a CSV (RFC 4180).
 * El cliente recibe el string y construye un Blob para descarga. Devolver
 * texto en lugar de Response permite reutilizar la action desde Server
 * Actions sin necesidad de un Route Handler dedicado.
 *
 * Filtra por delivered_at del pedido (no por allocated_at), para que el
 * reporte refleje el periodo contable de la venta real, no de la asignacion
 * (que puede ocurrir antes en pedidos pendientes que terminan partial).
 */
export async function exportLotProfitability(
  period: ExportPeriod
): Promise<ActionResponse<{ csv: string; filename: string; rows: number }>> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const range = resolveRange(period);
  if (!range) {
    return { success: false, error: "Periodo invalido: especifica { month: 'YYYY-MM' } o { from, to }" };
  }

  const { data, error } = await ctx.supabase
    .from("lot_profitability_view")
    .select("*")
    .gte("delivered_at", range.from)
    .lt("delivered_at", range.to)
    .order("delivered_at", { ascending: true });

  if (error) {
    logError("export_lot_profitability", error, { period });
    return { success: false, error: "Error al generar export" };
  }

  const rows = (data ?? []) as LotProfitabilityRow[];

  const headers = [
    "delivered_at",
    "order_id",
    "product_code",
    "product_name",
    "lot_number",
    "quantity_sold",
    "unit_cost",
    "unit_price",
    "unit_margin",
    "total_cost",
    "total_revenue",
    "total_margin",
    "margin_percent",
    "order_status",
  ];

  const lines: string[] = [headers.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.delivered_at,
        r.order_id,
        r.product_code,
        r.product_name,
        r.lot_number,
        r.quantity_sold,
        r.unit_cost_snapshot,
        r.unit_price,
        r.unit_margin,
        r.total_cost,
        r.total_revenue,
        r.total_margin,
        r.margin_percent,
        r.order_status,
      ]
        .map(csvEscape)
        .join(",")
    );
  }

  // Filename includes period to make downloads self-describing
  const filename = period.month
    ? `lot_profitability_${period.month}.csv`
    : `lot_profitability_${range.from}_${range.to}.csv`;

  logOperacion(
    "export_lot_profitability",
    { period, rows: rows.length, filename },
    ctx.user.id
  );

  return {
    success: true,
    data: { csv: lines.join("\n"), filename, rows: rows.length },
  };
}
