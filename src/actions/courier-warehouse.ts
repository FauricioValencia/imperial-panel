"use server";

import { revalidatePath } from "next/cache";
import { verifyAdmin, verifyAuth } from "@/lib/auth-helpers";
import {
  transferToCourierSchema,
  returnFromCourierSchema,
  resolveAdjustmentSchema,
  closeShiftSchema,
  type ActionResponse,
  type TransferToCourierInput,
  type ReturnFromCourierInput,
  type ResolveAdjustmentInput,
  type CloseShiftInput,
  type CourierInventorySummary,
  type StockTransfer,
  type PendingAdjustment,
  type InventoryGlobalRow,
} from "@/types";
import { logOperacion, logError } from "@/lib/logger";

// ============================================
// ADMIN ACTIONS
// ============================================

export async function transferStockToCourier(
  input: TransferToCourierInput
): Promise<ActionResponse<{ transfer_id: string }>> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const result = transferToCourierSchema.safeParse(input);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  const { courier_id, lines, notes } = result.data;

  const { data: transferId, error } = await ctx.supabase.rpc(
    "transfer_to_courier",
    {
      p_admin_id: ctx.user.id,
      p_courier_id: courier_id,
      p_lines: lines,
      p_notes: notes ?? null,
      p_created_by: ctx.user.id,
    }
  );

  if (error) {
    logError("transfer_to_courier", error, { courier_id, lines });
    return { success: false, error: error.message ?? "Error al transferir stock" };
  }

  logOperacion(
    "stock_transferred_to_courier",
    { transfer_id: transferId, courier_id, lines, notes },
    ctx.user.id
  );

  revalidatePath("/inventory");
  revalidatePath("/inventory/couriers");
  return { success: true, data: { transfer_id: transferId as string } };
}

export async function returnStockFromCourier(
  input: ReturnFromCourierInput
): Promise<ActionResponse<{ transfer_id: string }>> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const result = returnFromCourierSchema.safeParse(input);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  const { courier_id, lines, notes } = result.data;

  const { data: transferId, error } = await ctx.supabase.rpc(
    "return_from_courier",
    {
      p_admin_id: ctx.user.id,
      p_courier_id: courier_id,
      p_lines: lines,
      p_kind: "return",
      p_notes: notes ?? null,
      p_created_by: ctx.user.id,
    }
  );

  if (error) {
    logError("return_from_courier", error, { courier_id, lines });
    return { success: false, error: error.message ?? "Error al devolver stock" };
  }

  logOperacion(
    "stock_returned_from_courier",
    { transfer_id: transferId, courier_id, lines, notes },
    ctx.user.id
  );

  revalidatePath("/inventory");
  revalidatePath("/inventory/couriers");
  return { success: true, data: { transfer_id: transferId as string } };
}

export async function listCouriersWithInventory(): Promise<
  ActionResponse<{ courier_id: string; courier_name: string; total_units: number; products_count: number }[]>
> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const { data, error } = await ctx.supabase
    .from("users")
    .select("id, name")
    .eq("role", "courier")
    .eq("active", true)
    .eq("admin_id", ctx.user.id)
    .order("name");

  if (error) {
    logError("list_couriers_inventory", error);
    return { success: false, error: "Error al listar couriers" };
  }

  const couriers = (data ?? []) as { id: string; name: string }[];
  if (couriers.length === 0) return { success: true, data: [] };

  const { data: summary } = await ctx.supabase
    .from("courier_inventory_summary")
    .select("courier_id, total_units, product_id")
    .eq("admin_id", ctx.user.id);

  const byCourier = new Map<string, { total: number; products: Set<string> }>();
  for (const row of (summary ?? []) as {
    courier_id: string;
    total_units: number;
    product_id: string;
  }[]) {
    const entry = byCourier.get(row.courier_id) ?? { total: 0, products: new Set() };
    entry.total += Number(row.total_units);
    entry.products.add(row.product_id);
    byCourier.set(row.courier_id, entry);
  }

  return {
    success: true,
    data: couriers.map((c) => {
      const entry = byCourier.get(c.id);
      return {
        courier_id: c.id,
        courier_name: c.name,
        total_units: entry?.total ?? 0,
        products_count: entry?.products.size ?? 0,
      };
    }),
  };
}

export async function getCourierInventory(
  courierId: string
): Promise<ActionResponse<CourierInventorySummary[]>> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const { data, error } = await ctx.supabase
    .from("courier_inventory_summary")
    .select("*")
    .eq("admin_id", ctx.user.id)
    .eq("courier_id", courierId)
    .order("product_name");

  if (error) {
    logError("get_courier_inventory", error, { courier_id: courierId });
    return { success: false, error: "Error al obtener bodega del courier" };
  }

  return { success: true, data: (data ?? []) as CourierInventorySummary[] };
}

export interface CourierInventoryDetailRow {
  id: string;
  lot_id: string;
  product_id: string;
  product_name: string;
  product_code: string | null;
  lot_number: string;
  quantity_remaining: number;
  expires_at: string | null;
  unit_cost: number;
}

// Supabase JS infiere joins como arrays. Aplanamos el primer elemento (siempre
// es 1:1 por la FK uuid). El cast pasa por unknown para evitar la queja de TS.
type SupabaseDetailRow = {
  id: string;
  lot_id: string;
  product_id: string;
  quantity_remaining: number;
  product: { name: string; codigo: string | null } | { name: string; codigo: string | null }[] | null;
  lot:
    | { lot_number: string; expires_at: string | null; unit_cost: number }
    | { lot_number: string; expires_at: string | null; unit_cost: number }[]
    | null;
};

function flattenRel<T>(rel: T | T[] | null | undefined): T | null {
  if (!rel) return null;
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

function mapDetailRows(rows: unknown): CourierInventoryDetailRow[] {
  return (rows as SupabaseDetailRow[]).map((r) => {
    const product = flattenRel(r.product);
    const lot = flattenRel(r.lot);
    return {
      id: r.id,
      lot_id: r.lot_id,
      product_id: r.product_id,
      product_name: product?.name ?? "Producto",
      product_code: product?.codigo ?? null,
      lot_number: lot?.lot_number ?? "",
      quantity_remaining: r.quantity_remaining,
      expires_at: lot?.expires_at ?? null,
      unit_cost: Number(lot?.unit_cost ?? 0),
    };
  });
}

export async function getCourierInventoryDetailed(
  courierId: string
): Promise<ActionResponse<CourierInventoryDetailRow[]>> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const { data, error } = await ctx.supabase
    .from("courier_inventory")
    .select(
      `id, lot_id, product_id, quantity_remaining,
       product:products!product_id(name, codigo),
       lot:product_lots!lot_id(lot_number, expires_at, unit_cost)`
    )
    .eq("admin_id", ctx.user.id)
    .eq("courier_id", courierId)
    .gt("quantity_remaining", 0)
    .order("received_at", { ascending: true });

  if (error) {
    logError("get_courier_inventory_detailed", error, { courier_id: courierId });
    return { success: false, error: "Error al obtener detalle de bodega" };
  }

  return {
    success: true,
    data: mapDetailRows(data ?? []),
  };
}

export async function listInventoryGlobal(): Promise<ActionResponse<InventoryGlobalRow[]>> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const { data, error } = await ctx.supabase
    .from("inventory_global")
    .select("*")
    .eq("admin_id", ctx.user.id)
    .order("name");

  if (error) {
    logError("list_inventory_global", error);
    return { success: false, error: "Error al obtener inventario global" };
  }

  return { success: true, data: (data ?? []) as InventoryGlobalRow[] };
}

export async function listStockTransfers(
  courierId?: string
): Promise<ActionResponse<StockTransfer[]>> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  let query = ctx.supabase
    .from("stock_transfers")
    .select(
      `*,
       courier:users!courier_id(id, name, email),
       lines:stock_transfer_lines(*, product:products!product_id(id, name, codigo))`
    )
    .eq("admin_id", ctx.user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (courierId) query = query.eq("courier_id", courierId);

  const { data, error } = await query;

  if (error) {
    logError("list_stock_transfers", error);
    return { success: false, error: "Error al listar transferencias" };
  }

  return { success: true, data: (data ?? []) as StockTransfer[] };
}

export async function listPendingAdjustments(): Promise<ActionResponse<PendingAdjustment[]>> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const { data, error } = await ctx.supabase
    .from("pending_inventory_adjustments")
    .select(
      `*,
       product:products!product_id(id, name, codigo),
       courier:users!courier_id(id, name)`
    )
    .eq("admin_id", ctx.user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    logError("list_pending_adjustments", error);
    return { success: false, error: "Error al listar ajustes pendientes" };
  }

  return { success: true, data: (data ?? []) as PendingAdjustment[] };
}

export async function resolvePendingAdjustment(
  input: ResolveAdjustmentInput
): Promise<ActionResponse> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const result = resolveAdjustmentSchema.safeParse(input);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  const { adjustment_id, resolution_note } = result.data;

  const { error } = await ctx.supabase
    .from("pending_inventory_adjustments")
    .update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
      resolved_by: ctx.user.id,
      resolution_note,
    })
    .eq("id", adjustment_id)
    .eq("admin_id", ctx.user.id)
    .eq("status", "pending");

  if (error) {
    logError("resolve_pending_adjustment", error, { adjustment_id });
    return { success: false, error: "Error al resolver ajuste" };
  }

  logOperacion(
    "pending_adjustment_resolved",
    { adjustment_id, resolution_note },
    ctx.user.id
  );

  revalidatePath("/inventory");
  return { success: true };
}

// ============================================
// COURIER ACTIONS
// ============================================

export async function getMyInventory(): Promise<ActionResponse<CourierInventorySummary[]>> {
  const ctx = await verifyAuth();
  if (!ctx || ctx.user.role !== "courier") {
    return { success: false, error: "Unauthorized" };
  }

  const { data, error } = await ctx.supabase
    .from("courier_inventory_summary")
    .select("*")
    .eq("courier_id", ctx.user.id)
    .order("product_name");

  if (error) {
    logError("get_my_inventory", error);
    return { success: false, error: "Error al obtener tu bodega" };
  }

  return { success: true, data: (data ?? []) as CourierInventorySummary[] };
}

export async function getMyInventoryDetailed(): Promise<
  ActionResponse<CourierInventoryDetailRow[]>
> {
  const ctx = await verifyAuth();
  if (!ctx || ctx.user.role !== "courier") {
    return { success: false, error: "Unauthorized" };
  }

  const { data, error } = await ctx.supabase
    .from("courier_inventory")
    .select(
      `id, lot_id, product_id, quantity_remaining,
       product:products!product_id(name, codigo),
       lot:product_lots!lot_id(lot_number, expires_at, unit_cost)`
    )
    .eq("courier_id", ctx.user.id)
    .gt("quantity_remaining", 0)
    .order("received_at", { ascending: true });

  if (error) {
    logError("get_my_inventory_detailed", error);
    return { success: false, error: "Error al obtener detalle de bodega" };
  }

  return {
    success: true,
    data: mapDetailRows(data ?? []),
  };
}

export async function listMyTransfers(): Promise<ActionResponse<StockTransfer[]>> {
  const ctx = await verifyAuth();
  if (!ctx || ctx.user.role !== "courier") {
    return { success: false, error: "Unauthorized" };
  }

  const { data, error } = await ctx.supabase
    .from("stock_transfers")
    .select(
      `*,
       lines:stock_transfer_lines(*, product:products!product_id(id, name, codigo))`
    )
    .eq("courier_id", ctx.user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    logError("list_my_transfers", error);
    return { success: false, error: "Error al listar tus transferencias" };
  }

  return { success: true, data: (data ?? []) as StockTransfer[] };
}

export async function closeDailyShift(
  input: CloseShiftInput
): Promise<ActionResponse<{ closing_id: string; transfer_id: string | null }>> {
  const ctx = await verifyAuth();
  if (!ctx || ctx.user.role !== "courier") {
    return { success: false, error: "Unauthorized" };
  }
  if (!ctx.user.admin_id) {
    return { success: false, error: "El courier no esta vinculado a un admin" };
  }

  const result = closeShiftSchema.safeParse(input);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  const { reported_total, returns, notes } = result.data;
  const today = new Date().toISOString().slice(0, 10);

  // System total: pagos en efectivo de hoy del courier (lo que tiene en mano)
  const startOfDay = `${today}T00:00:00.000Z`;
  const endOfDay = `${today}T23:59:59.999Z`;

  const { data: paymentsRows, error: paymentsError } = await ctx.supabase
    .from("payments")
    .select("amount, payment_method")
    .eq("registered_by", ctx.user.id)
    .eq("admin_id", ctx.user.admin_id)
    .eq("payment_method", "cash")
    .gte("created_at", startOfDay)
    .lte("created_at", endOfDay);

  if (paymentsError) {
    logError("close_shift_payments", paymentsError);
    return { success: false, error: "Error al calcular total del sistema" };
  }

  const systemTotal = (paymentsRows ?? []).reduce(
    (acc, p: { amount: number }) => acc + Number(p.amount),
    0
  );
  const difference = Number(reported_total) - systemTotal;
  const status = Math.abs(difference) < 0.01 ? "approved" : "with_difference";

  // Crear cash_closing
  const { data: closing, error: closingError } = await ctx.supabase
    .from("cash_closings")
    .insert({
      courier_id: ctx.user.id,
      admin_id: ctx.user.admin_id,
      date: today,
      reported_total,
      system_total: systemTotal,
      difference,
      status,
      notes: notes ?? null,
    })
    .select("id")
    .single();

  if (closingError) {
    logError("close_shift_create", closingError);
    if (closingError.code === "23505") {
      return { success: false, error: "Ya existe un cierre para hoy" };
    }
    return { success: false, error: "Error al crear cierre de caja" };
  }

  // Si hay devoluciones de bodega, ejecutarlas en una transferencia
  let transferId: string | null = null;
  if (returns.length > 0) {
    const { data: returnId, error: returnError } = await ctx.supabase.rpc(
      "return_from_courier",
      {
        p_admin_id: ctx.user.admin_id,
        p_courier_id: ctx.user.id,
        p_lines: returns,
        p_kind: "return",
        p_notes: `Cierre de turno ${today}`,
        p_created_by: ctx.user.id,
      }
    );

    if (returnError) {
      logError("close_shift_returns", returnError);
      // No revertimos el cierre: la caja ya se reporto. El admin debera
      // resolver manualmente la devolucion pendiente.
      return {
        success: false,
        error: `Cierre creado pero error al devolver bodega: ${returnError.message}`,
      };
    }
    transferId = returnId as string;
  }

  logOperacion(
    "shift_closed",
    {
      closing_id: closing.id,
      transfer_id: transferId,
      reported_total,
      system_total: systemTotal,
      difference,
      returned_lines: returns.length,
    },
    ctx.user.id
  );

  revalidatePath("/deliveries");
  revalidatePath("/history");
  return { success: true, data: { closing_id: closing.id, transfer_id: transferId } };
}

export async function listMyInventoryMovements(): Promise<
  ActionResponse<
    {
      id: string;
      type: string;
      quantity: number;
      product_id: string;
      product_name: string;
      lot_id: string | null;
      created_at: string;
      notes: string | null;
    }[]
  >
> {
  const ctx = await verifyAuth();
  if (!ctx || ctx.user.role !== "courier") {
    return { success: false, error: "Unauthorized" };
  }

  const { data, error } = await ctx.supabase
    .from("inventory_movements")
    .select(
      `id, type, quantity, product_id, lot_id, created_at, notes,
       product:products!product_id(name)`
    )
    .eq("courier_id", ctx.user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    logError("list_my_inventory_movements", error);
    return { success: false, error: "Error al obtener historial" };
  }

  type Row = {
    id: string;
    type: string;
    quantity: number;
    product_id: string;
    lot_id: string | null;
    created_at: string;
    notes: string | null;
    product: { name: string } | { name: string }[] | null;
  };

  return {
    success: true,
    data: ((data ?? []) as unknown as Row[]).map((r) => {
      const product = flattenRel(r.product);
      return {
        id: r.id,
        type: r.type,
        quantity: r.quantity,
        product_id: r.product_id,
        product_name: product?.name ?? "Producto",
        lot_id: r.lot_id,
        created_at: r.created_at,
        notes: r.notes,
      };
    }),
  };
}
