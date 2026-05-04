"use server";

import { revalidatePath } from "next/cache";
import { verifyAdmin } from "@/lib/auth-helpers";
import {
  createDirectSaleSchema,
  type ActionResponse,
  type CreateDirectSaleInput,
  type DirectSaleProductOption,
} from "@/types";
import { logOperacion, logError } from "@/lib/logger";
import {
  cargarPreciosResueltosPorProducto,
  validarItemsContraPreciosResueltos,
} from "@/lib/customer-pricing";

/** Productos con stock vendible solo en bodega central (para UI venta directa). */
export async function listProductsForDirectSale(): Promise<
  ActionResponse<DirectSaleProductOption[]>
> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const { data, error } = await ctx.supabase
    .from("inventory_global")
    .select("product_id, name, codigo, price, warehouse_available")
    .eq("admin_id", ctx.user.id)
    .gt("warehouse_available", 0)
    .order("name", { ascending: true });

  if (error) {
    logError("list_products_direct_sale", error);
    return { success: false, error: "Error al cargar productos" };
  }

  const rows = (data ?? []) as {
    product_id: string;
    name: string;
    codigo: string | null;
    price: number;
    warehouse_available: number;
  }[];

  return {
    success: true,
    data: rows.map((r) => ({
      id: r.product_id,
      name: r.name,
      codigo: r.codigo,
      price: Number(r.price),
      warehouse_available: Number(r.warehouse_available),
    })),
  };
}

/**
 * Registra venta en mostrador: orden en delivered, descuenta stock central (FIFO).
 * Sin payment_method el total queda en cartera; con payment_method registra pago completo.
 */
export async function createDirectSale(
  input: CreateDirectSaleInput
): Promise<ActionResponse<{ id: string }>> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const parsed = createDirectSaleSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { customer_id, items, notes, allow_loss, payment_method, allow_price_override } =
    parsed.data;
  const adminId = ctx.user.id;

  const { data: customer, error: custErr } = await ctx.supabase
    .from("customers")
    .select("id, active, admin_id")
    .eq("id", customer_id)
    .single();

  if (custErr || !customer) {
    return { success: false, error: "Cliente no encontrado" };
  }
  if (!customer.active) {
    return { success: false, error: "Cliente inactivo" };
  }
  if (customer.admin_id !== adminId) {
    return { success: false, error: "Cliente no pertenece a este negocio" };
  }

  const productIds = Array.from(new Set(items.map((i) => i.product_id)));
  const nowIso = new Date().toISOString();

  const { data: lotRows, error: lotsFetchErr } = await ctx.supabase
    .from("product_lots")
    .select("product_id, unit_cost, quantity_remaining, received_at, id")
    .eq("admin_id", adminId)
    .in("product_id", productIds)
    .eq("active", true)
    .gt("quantity_remaining", 0)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .order("product_id", { ascending: true })
    .order("received_at", { ascending: true })
    .order("id", { ascending: true });

  if (lotsFetchErr) {
    logError("direct_sale_lots_fetch", lotsFetchErr);
    return { success: false, error: "Error verificando stock en bodega central" };
  }

  const centralAvailable = new Map<string, number>();
  for (const lot of (lotRows ?? []) as { product_id: string; quantity_remaining: number }[]) {
    centralAvailable.set(
      lot.product_id,
      (centralAvailable.get(lot.product_id) ?? 0) + lot.quantity_remaining
    );
  }

  const requiredByProduct = new Map<string, number>();
  for (const item of items) {
    requiredByProduct.set(
      item.product_id,
      (requiredByProduct.get(item.product_id) ?? 0) + item.quantity
    );
  }

  const { data: nameRows } = await ctx.supabase
    .from("products")
    .select("id, name")
    .eq("admin_id", adminId)
    .in("id", productIds);

  const nameById = new Map((nameRows as { id: string; name: string }[] | null)?.map((p) => [p.id, p.name]) ?? []);

  for (const [productId, requiredQty] of requiredByProduct) {
    const avail = centralAvailable.get(productId) ?? 0;
    if (avail < requiredQty) {
      const nm = nameById.get(productId) ?? "Producto";
      return {
        success: false,
        error: `Stock insuficiente en bodega central para ${nm}: ${avail} disponible, ${requiredQty} solicitado`,
      };
    }
  }

  let resolvedPrices: Map<string, number>;
  try {
    resolvedPrices = await cargarPreciosResueltosPorProducto(ctx.supabase, {
      adminId: adminId,
      customerId: customer_id,
      productIds: [...productIds],
    });
  } catch (e) {
    logError("direct_sale_price_resolve", e, { customer_id });
    return { success: false, error: "Error validando precios de la venta" };
  }

  for (const item of items) {
    if (!resolvedPrices.has(item.product_id)) {
      const nm = nameById.get(item.product_id) ?? "Producto";
      return {
        success: false,
        error: `${nm}: no tiene precio de catalogo valido para este negocio`,
      };
    }
  }

  const priceValidation = validarItemsContraPreciosResueltos(items, resolvedPrices);
  if (!priceValidation.ok) {
    if (!allow_price_override) {
      const first = priceValidation.desajustes[0];
      const nm = nameById.get(first.product_id) ?? "Producto";
      return {
        success: false,
        error: `${nm}: precio ${first.enviado} no coincide con el calculado en el servidor (${Number.isFinite(first.esperado) ? first.esperado.toFixed(2) : "?"}; lista o acuerdo del cliente). Revise precios del catálogo y del cliente, actualice la página y reintente.`,
      };
    }
    logOperacion(
      "direct_sale_with_price_override",
      { customer_id, desajustes: priceValidation.desajustes },
      adminId
    );
  }

  const lotsByProduct = new Map<string, { unit_cost: number; quantity_remaining: number }[]>();
  for (const lot of (lotRows ?? []) as {
    product_id: string;
    unit_cost: number;
    quantity_remaining: number;
  }[]) {
    const arr = lotsByProduct.get(lot.product_id) ?? [];
    arr.push({ unit_cost: Number(lot.unit_cost), quantity_remaining: lot.quantity_remaining });
    lotsByProduct.set(lot.product_id, arr);
  }

  const lossWarnings: {
    product_id: string;
    product_name: string;
    unit_price: number;
    projected_avg_cost: number;
  }[] = [];

  for (const item of items) {
    const lots = lotsByProduct.get(item.product_id) ?? [];
    let remaining = item.quantity;
    let totalCost = 0;
    for (const lot of lots) {
      if (remaining <= 0) break;
      const consume = Math.min(remaining, lot.quantity_remaining);
      totalCost += consume * lot.unit_cost;
      remaining -= consume;
      lot.quantity_remaining -= consume;
    }
    if (remaining > 0) continue;
    const projectedAvgCost = totalCost / item.quantity;
    if (item.unit_price < projectedAvgCost) {
      lossWarnings.push({
        product_id: item.product_id,
        product_name: nameById.get(item.product_id) ?? "Producto",
        unit_price: item.unit_price,
        projected_avg_cost: projectedAvgCost,
      });
    }
  }

  if (lossWarnings.length > 0 && !allow_loss) {
    const first = lossWarnings[0];
    const extra = lossWarnings.length > 1 ? ` (y ${lossWarnings.length - 1} mas)` : "";
    return {
      success: false,
      error: `${first.product_name}: precio ${first.unit_price} por unidad está por debajo del costo proyectado (${first.projected_avg_cost.toFixed(2)} c/u)${extra}. Active la opción «Permitir venta con pérdida» en el formulario y vuelva a enviar.`,
    };
  }

  if (lossWarnings.length > 0 && allow_loss) {
    logOperacion(
      "direct_sale_with_loss_override",
      { customer_id, loss_items: lossWarnings },
      adminId
    );
  }

  const total = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const deliveredAt = new Date().toISOString();

  const { data: order, error: orderErr } = await ctx.supabase
    .from("orders")
    .insert({
      customer_id,
      total,
      notes: notes ?? null,
      status: "delivered",
      order_type: "direct",
      delivered_at: deliveredAt,
      courier_id: null,
      admin_id: adminId,
    })
    .select("id")
    .single();

  if (orderErr || !order) {
    logError("direct_sale_insert_order", orderErr);
    return { success: false, error: "Error al crear la venta" };
  }

  const orderId = order.id;

  const insertedItems: { id: string; product_id: string; quantity: number }[] = [];

  for (const item of items) {
    const { data: row, error: itemErr } = await ctx.supabase
      .from("order_items")
      .insert({
        order_id: orderId,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        reference_unit_price: resolvedPrices.get(item.product_id) ?? null,
        admin_id: adminId,
      })
      .select("id, product_id, quantity")
      .single();

    if (itemErr || !row) {
      logError("direct_sale_insert_item", itemErr, { order_id: orderId });
      await ctx.supabase.from("order_items").delete().eq("order_id", orderId);
      await ctx.supabase.from("orders").delete().eq("id", orderId);
      return { success: false, error: "Error al registrar items de la venta" };
    }

    insertedItems.push(row as { id: string; product_id: string; quantity: number });
  }

  const deducted: { order_item_id: string; quantity: number }[] = [];

  for (const row of insertedItems) {
    const { error: stockErr } = await ctx.supabase.rpc("deduct_stock", {
      p_product_id: row.product_id,
      p_quantity: row.quantity,
      p_admin_id: adminId,
      p_order_item_id: row.id,
      p_order_reference: orderId,
      p_notes: "Venta directa (mostrador)",
    });

    if (stockErr) {
      for (const d of [...deducted].reverse()) {
        const { error: revErr } = await ctx.supabase.rpc("return_stock_by_item", {
          p_order_item_id: d.order_item_id,
          p_quantity: d.quantity,
          p_admin_id: adminId,
        });
        if (revErr) {
          logError("direct_sale_rollback_stock", revErr, { order_id: orderId, item: d });
        }
      }
      await ctx.supabase.from("order_items").delete().eq("order_id", orderId);
      await ctx.supabase.from("orders").delete().eq("id", orderId);
      logError("direct_sale_deduct_stock", stockErr, { order_id: orderId });
      return {
        success: false,
        error: stockErr.message ?? "Error al descontar stock central",
      };
    }

    deducted.push({ order_item_id: row.id, quantity: row.quantity });
  }

  if (payment_method) {
    const { error: payErr } = await ctx.supabase.from("payments").insert({
      order_id: orderId,
      customer_id,
      amount: total,
      type: "full",
      payment_method,
      registered_by: adminId,
      admin_id: ctx.user.admin_id ?? adminId,
    });

    if (payErr) {
      for (const d of [...deducted].reverse()) {
        await ctx.supabase.rpc("return_stock_by_item", {
          p_order_item_id: d.order_item_id,
          p_quantity: d.quantity,
          p_admin_id: adminId,
        });
      }
      await ctx.supabase.from("order_items").delete().eq("order_id", orderId);
      await ctx.supabase.from("orders").delete().eq("id", orderId);
      logError("direct_sale_payment", payErr, { order_id: orderId });
      return { success: false, error: "Error al registrar el pago" };
    }
  }

  const { error: balanceErr } = await ctx.supabase.rpc("update_customer_balance", {
    p_customer_id: customer_id,
  });

  if (balanceErr) {
    logError("direct_sale_balance", balanceErr, { customer_id });
  }

  logOperacion(
    "direct_sale_created",
    {
      order_id: orderId,
      customer_id,
      total,
      payment_immediate: Boolean(payment_method),
      items_count: items.length,
    },
    adminId
  );

  revalidatePath("/orders");
  revalidatePath("/billing");
  revalidatePath("/inventory");
  return { success: true, data: { id: orderId } };
}
