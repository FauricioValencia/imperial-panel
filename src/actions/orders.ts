"use server";

import { revalidatePath } from "next/cache";
import { verifyAdmin, verifyAuth } from "@/lib/auth-helpers";
import {
  createOrderSchema,
  assignCourierSchema,
  confirmDeliverySchema,
  type ActionResponse,
  type Order,
  type CreateOrderInput,
  type User,
} from "@/types";
import { logOperacion, logError } from "@/lib/logger";

export async function listOrders(
  statusFilter?: string
): Promise<ActionResponse<Order[]>> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  let query = ctx.supabase
    .from("orders")
    .select(`
      *,
      customer:customers!customer_id(id, name, phone, address),
      courier:users!courier_id(id, name, email)
    `)
    .order("created_at", { ascending: false });

  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;

  if (error) {
    logError("list_orders", error);
    return { success: false, error: "Error fetching orders" };
  }

  return { success: true, data: data as Order[] };
}

export async function getOrder(orderId: string): Promise<ActionResponse<Order>> {
  const ctx = await verifyAuth();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const { data, error } = await ctx.supabase
    .from("orders")
    .select(`
      *,
      customer:customers!customer_id(id, name, phone, address, pending_balance),
      courier:users!courier_id(id, name, email),
      items:order_items(
        id, order_id, product_id, quantity, unit_price, returned, returned_quantity,
        product:products!product_id(id, name, price, stock)
      )
    `)
    .eq("id", orderId)
    .single();

  if (error) {
    logError("get_order", error);
    return { success: false, error: "Error fetching order" };
  }

  return { success: true, data: data as Order };
}

export async function createOrder(
  input: CreateOrderInput
): Promise<ActionResponse<{ id: string }>> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const result = createOrderSchema.safeParse(input);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  const { customer_id, items, notes, allow_loss } = result.data;

  // Validar stock vigente disponible antes de crear la orden.
  // stock_available = suma de quantity_remaining de lotes vigentes
  // (no vencidos, activos). Es la cifra que deduct_stock realmente
  // puede consumir; products.stock incluye vencidos bloqueados.
  const productIds = Array.from(new Set(items.map((i) => i.product_id)));
  const { data: stockRows, error: stockFetchError } = await ctx.supabase
    .from("products")
    .select("id, name, stock_available")
    .eq("admin_id", ctx.user.id)
    .in("id", productIds);

  if (stockFetchError) {
    logError("create_order_stock_check", stockFetchError);
    return { success: false, error: "Error verificando stock disponible" };
  }

  const stockMap = new Map(
    (stockRows as { id: string; name: string; stock_available: number }[] | null)?.map((p) => [
      p.id,
      p,
    ]) ?? []
  );

  const requiredByProduct = new Map<string, number>();
  for (const item of items) {
    requiredByProduct.set(
      item.product_id,
      (requiredByProduct.get(item.product_id) ?? 0) + item.quantity
    );
  }

  for (const [productId, requiredQty] of requiredByProduct) {
    const product = stockMap.get(productId);
    if (!product) {
      return { success: false, error: "Producto no encontrado" };
    }
    if (product.stock_available < requiredQty) {
      return {
        success: false,
        error: `Stock vigente insuficiente para ${product.name}: ${product.stock_available} disponible, ${requiredQty} solicitado`,
      };
    }
  }

  // Validar margen proyectado FIFO contra unit_price.
  // Simulamos el consumo de lotes que haria deduct_stock para anticipar
  // el costo. Si unit_price < costo proyectado promedio ponderado, es
  // una venta con perdida y requiere allow_loss explicito.
  // Nota: hay un riesgo de race (lotes pueden cambiar entre validacion y
  // entrega), pero deduct_stock fallara con stock insuficiente si pasa.
  const nowIso = new Date().toISOString();
  const { data: lotRows, error: lotsError } = await ctx.supabase
    .from("product_lots")
    .select("product_id, unit_cost, quantity_remaining, received_at, id")
    .eq("admin_id", ctx.user.id)
    .in("product_id", productIds)
    .eq("active", true)
    .gt("quantity_remaining", 0)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .order("product_id", { ascending: true })
    .order("received_at", { ascending: true })
    .order("id", { ascending: true });

  if (lotsError) {
    logError("create_order_margin_check", lotsError);
    return { success: false, error: "Error verificando margen proyectado" };
  }

  // Agrupar lotes por producto (ya vienen ordenados FIFO en la query).
  const lotsByProduct = new Map<
    string,
    { unit_cost: number; quantity_remaining: number }[]
  >();
  for (const lot of (lotRows ?? []) as {
    product_id: string;
    unit_cost: number;
    quantity_remaining: number;
  }[]) {
    const arr = lotsByProduct.get(lot.product_id) ?? [];
    arr.push({ unit_cost: Number(lot.unit_cost), quantity_remaining: lot.quantity_remaining });
    lotsByProduct.set(lot.product_id, arr);
  }

  // Para cada item, simular consumo FIFO sobre los lotes restantes y
  // calcular el costo promedio ponderado proyectado. Items duplicados del
  // mismo producto consumen secuencialmente (el siguiente ve menos lotes).
  const lossWarnings: {
    product_id: string;
    product_name: string;
    unit_price: number;
    projected_avg_cost: number;
    margin_unit: number;
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
    if (remaining > 0) {
      // No deberia pasar (validacion previa de stock_available), pero
      // por seguridad: si no alcanzan los lotes vigentes, abortamos.
      const product = stockMap.get(item.product_id);
      return {
        success: false,
        error: `Stock vigente insuficiente para ${product?.name ?? item.product_id}`,
      };
    }
    const projectedAvgCost = totalCost / item.quantity;
    if (item.unit_price < projectedAvgCost) {
      const product = stockMap.get(item.product_id)!;
      lossWarnings.push({
        product_id: item.product_id,
        product_name: product.name,
        unit_price: item.unit_price,
        projected_avg_cost: projectedAvgCost,
        margin_unit: item.unit_price - projectedAvgCost,
      });
    }
  }

  if (lossWarnings.length > 0 && !allow_loss) {
    const first = lossWarnings[0];
    const extra = lossWarnings.length > 1 ? ` (y ${lossWarnings.length - 1} mas)` : "";
    return {
      success: false,
      error: `${first.product_name}: precio ${first.unit_price} es menor al costo proyectado ${first.projected_avg_cost.toFixed(2)}${extra}. Marca "permitir venta con perdida" si es intencional.`,
    };
  }

  if (lossWarnings.length > 0 && allow_loss) {
    logOperacion(
      "order_created_with_loss_override",
      { customer_id, loss_items: lossWarnings },
      ctx.user.id
    );
  }

  // Calculate total
  const total = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  // Insert order
  const { data: order, error: orderError } = await ctx.supabase
    .from("orders")
    .insert({ customer_id, total, notes, status: "pending", admin_id: ctx.user.id })
    .select("id")
    .single();

  if (orderError) {
    logError("create_order", orderError);
    return { success: false, error: "Error creating order" };
  }

  // Insert order items
  const orderItems = items.map((item) => ({
    order_id: order.id,
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    admin_id: ctx.user.id,
  }));

  const { error: itemsError } = await ctx.supabase
    .from("order_items")
    .insert(orderItems);

  if (itemsError) {
    logError("create_order_items", itemsError);
    // Rollback order
    await ctx.supabase.from("orders").delete().eq("id", order.id);
    return { success: false, error: "Error creating order items" };
  }

  logOperacion("order_created", {
    order_id: order.id,
    customer_id,
    total,
    items_count: items.length,
  }, ctx.user.id);

  revalidatePath("/orders");
  return { success: true, data: { id: order.id } };
}

export async function assignCourier(
  orderId: string,
  courierId: string
): Promise<ActionResponse> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const validation = assignCourierSchema.safeParse({
    order_id: orderId,
    courier_id: courierId,
  });
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0].message };
  }

  // Verify order exists and is pending
  const { data: order } = await ctx.supabase
    .from("orders")
    .select("id, status")
    .eq("id", orderId)
    .single();

  if (!order) return { success: false, error: "Order not found" };
  if (order.status !== "pending") {
    return { success: false, error: "Order must be pending to assign a courier" };
  }

  // Update order (stock is deducted on delivery confirmation, not here)
  const { error } = await ctx.supabase
    .from("orders")
    .update({
      courier_id: courierId,
      status: "assigned",
      assigned_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (error) {
    logError("assign_courier", error, { order_id: orderId });
    return { success: false, error: "Error assigning courier" };
  }

  logOperacion("courier_assigned", {
    order_id: orderId,
    courier_id: courierId,
  }, ctx.user.id);

  revalidatePath("/orders");
  return { success: true };
}

export async function listCouriers(): Promise<ActionResponse<User[]>> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const { data, error } = await ctx.supabase
    .from("users")
    .select("*")
    .eq("role", "courier")
    .eq("active", true)
    .eq("admin_id", ctx.user.id)
    .order("name");

  if (error) {
    logError("list_couriers", error);
    return { success: false, error: "Error fetching couriers" };
  }

  return { success: true, data: data as User[] };
}

// Courier: list my deliveries
export async function listMyDeliveries(): Promise<ActionResponse<Order[]>> {
  const ctx = await verifyAuth();
  if (!ctx || ctx.user.role !== "courier") {
    return { success: false, error: "Unauthorized" };
  }

  const { data, error } = await ctx.supabase
    .from("orders")
    .select(`
      *,
      customer:customers!customer_id(id, name, phone, address),
      items:order_items(
        id, product_id, quantity, unit_price, returned, returned_quantity,
        product:products!product_id(id, name)
      )
    `)
    .eq("courier_id", ctx.user.id)
    .in("status", ["assigned", "in_transit"])
    .order("created_at", { ascending: false });

  if (error) {
    logError("list_my_deliveries", error);
    return { success: false, error: "Error fetching deliveries" };
  }

  return { success: true, data: data as Order[] };
}

// Courier: mark as in transit
export async function markInTransit(orderId: string): Promise<ActionResponse> {
  const ctx = await verifyAuth();
  if (!ctx || ctx.user.role !== "courier") {
    return { success: false, error: "Unauthorized" };
  }

  const { error } = await ctx.supabase
    .from("orders")
    .update({ status: "in_transit" })
    .eq("id", orderId)
    .eq("courier_id", ctx.user.id)
    .eq("status", "assigned");

  if (error) {
    logError("mark_in_transit", error, { order_id: orderId });
    return { success: false, error: "Error updating order" };
  }

  logOperacion("order_in_transit", { order_id: orderId }, ctx.user.id);
  revalidatePath("/deliveries");
  return { success: true };
}

// Courier: confirm delivery with optional returns
export async function confirmDelivery(
  orderId: string,
  returnedItems?: { order_item_id: string; returned_quantity: number }[]
): Promise<ActionResponse> {
  const ctx = await verifyAuth();
  if (!ctx || ctx.user.role !== "courier") {
    return { success: false, error: "Unauthorized" };
  }

  const validation = confirmDeliverySchema.safeParse({
    order_id: orderId,
    returned_items: returnedItems,
  });
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0].message };
  }

  // Get order items
  const { data: order } = await ctx.supabase
    .from("orders")
    .select("id, status, customer_id, items:order_items(id, product_id, quantity)")
    .eq("id", orderId)
    .eq("courier_id", ctx.user.id)
    .single();

  if (!order) return { success: false, error: "Order not found" };
  if (!["assigned", "in_transit"].includes(order.status)) {
    return { success: false, error: "Order cannot be delivered in current status" };
  }

  const items = order.items as { id: string; product_id: string; quantity: number }[];
  const hasReturns = returnedItems && returnedItems.length > 0;

  // Build a map of returned quantities per order_item_id
  const returnMap = new Map<string, number>();
  if (hasReturns) {
    for (const r of returnedItems) {
      returnMap.set(r.order_item_id, r.returned_quantity);
    }
  }

  // Server-side validation: cada returned_quantity debe corresponder a un
  // order_item de esta orden y no exceder su quantity. El cliente ya valida
  // pero un payload manipulado podria causar stock negativo o datos corruptos.
  const itemIds = new Set(items.map((i) => i.id));
  for (const [orderItemId, qty] of returnMap.entries()) {
    if (!itemIds.has(orderItemId)) {
      logError("confirm_delivery_invalid_item", new Error("returned item not in order"), {
        order_id: orderId,
        order_item_id: orderItemId,
      });
      return { success: false, error: "Item devuelto no pertenece a la orden" };
    }
    const item = items.find((i) => i.id === orderItemId)!;
    if (qty > item.quantity) {
      logError("confirm_delivery_excess_return", new Error("returned > ordered"), {
        order_id: orderId,
        order_item_id: orderItemId,
        ordered: item.quantity,
        returned: qty,
      });
      return {
        success: false,
        error: `Cantidad devuelta (${qty}) excede la cantidad del pedido (${item.quantity})`,
      };
    }
  }

  // Determine the admin_id this courier belongs to (required by deduct_stock)
  const courierAdminId = ctx.user.admin_id;
  if (!courierAdminId) {
    logError("confirm_delivery_no_admin", new Error("Courier missing admin_id"), { order_id: orderId });
    return { success: false, error: "El courier no esta vinculado a un admin" };
  }

  // Deduct stock only for delivered quantities (total - returned).
  // The new deduct_stock signature uses FIFO multi-lot and records
  // outbound_lot_allocations per order_item; rollback uses
  // return_stock_by_item which reverts to the exact origin lot.
  let allReturned = true;
  const deductedItems: { order_item_id: string; quantity: number }[] = [];
  // Allocations consumidas por lote (para audit log). Cada entrada captura
  // que lote suministro cuanto y a que costo unitario, permitiendo trazar
  // COGS por entrega sin depender de la vista lot_profitability_view.
  const allocationsLog: {
    order_item_id: string;
    product_id: string;
    lot_id: string;
    allocated_qty: number;
    unit_cost: number;
  }[] = [];

  for (const item of items) {
    const returnedQty = returnMap.get(item.id) ?? 0;
    const deliveredQty = item.quantity - returnedQty;

    if (deliveredQty > 0) {
      allReturned = false;

      const { data: allocations, error: stockError } = await ctx.supabase.rpc("deduct_stock", {
        p_product_id: item.product_id,
        p_quantity: deliveredQty,
        p_admin_id: courierAdminId,
        p_order_item_id: item.id,
        p_order_reference: orderId,
        p_notes: null,
      });

      if (stockError) {
        // Rollback previously deducted items via allocations (LIFO)
        for (const deducted of deductedItems) {
          await ctx.supabase.rpc("return_stock_by_item", {
            p_order_item_id: deducted.order_item_id,
            p_quantity: deducted.quantity,
            p_admin_id: courierAdminId,
          });
        }
        logError("confirm_delivery_stock", stockError, { order_id: orderId });
        return {
          success: false,
          error: stockError.message ?? "Error al descontar stock",
        };
      }

      // deduct_stock RETURNS TABLE(lot_id, allocated_qty, unit_cost): puede
      // ser multi-fila si el FIFO consumio de varios lotes.
      if (Array.isArray(allocations)) {
        for (const a of allocations as { lot_id: string; allocated_qty: number; unit_cost: number }[]) {
          allocationsLog.push({
            order_item_id: item.id,
            product_id: item.product_id,
            lot_id: a.lot_id,
            allocated_qty: a.allocated_qty,
            unit_cost: a.unit_cost,
          });
        }
      }

      deductedItems.push({ order_item_id: item.id, quantity: deliveredQty });
    }

    // Update order item if it has returns
    if (returnedQty > 0) {
      const { error: itemUpdateError } = await ctx.supabase
        .from("order_items")
        .update({
          returned: returnedQty >= item.quantity,
          returned_quantity: returnedQty,
        })
        .eq("id", item.id);

      if (itemUpdateError) {
        logError("confirm_delivery_update_item", itemUpdateError, { order_id: orderId });
        return { success: false, error: "Error al actualizar items" };
      }
    }
  }

  // Determine final status
  const finalStatus = allReturned ? "returned" : hasReturns ? "partial" : "delivered";

  const { error: statusError } = await ctx.supabase
    .from("orders")
    .update({
      status: finalStatus,
      delivered_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (statusError) {
    logError("confirm_delivery_status", statusError, { order_id: orderId });
    return { success: false, error: "Error al actualizar estado del pedido" };
  }

  // Update customer balance
  const { error: balanceError } = await ctx.supabase.rpc("update_customer_balance", {
    p_customer_id: order.customer_id,
  });

  if (balanceError) {
    logError("confirm_delivery_balance", balanceError, { order_id: orderId });
  }

  // COGS total real: suma del costo consumido por lote (incluye multi-lote
  // por FIFO). Se calcula desde allocationsLog para auditoria financiera.
  const totalCogs = allocationsLog.reduce(
    (sum, a) => sum + a.allocated_qty * Number(a.unit_cost),
    0
  );

  logOperacion(hasReturns ? "delivery_confirmed_with_returns" : "delivery_confirmed", {
    order_id: orderId,
    status: finalStatus,
    returned_items: returnMap.size,
    total_cogs: totalCogs,
    allocations: allocationsLog,
  }, ctx.user.id);

  revalidatePath("/deliveries");
  revalidatePath("/orders");
  return { success: true };
}

// Courier: list delivery history (completed/returned/partial)
export async function listMyHistory(): Promise<ActionResponse<Order[]>> {
  const ctx = await verifyAuth();
  if (!ctx || ctx.user.role !== "courier") {
    return { success: false, error: "Unauthorized" };
  }

  const { data, error } = await ctx.supabase
    .from("orders")
    .select(`
      *,
      customer:customers!customer_id(id, name, phone, address),
      items:order_items(
        id, product_id, quantity, unit_price, returned, returned_quantity,
        product:products!product_id(id, name)
      )
    `)
    .eq("courier_id", ctx.user.id)
    .in("status", ["delivered", "returned", "partial"])
    .order("delivered_at", { ascending: false })
    .limit(50);

  if (error) {
    logError("list_my_history", error);
    return { success: false, error: "Error fetching history" };
  }

  return { success: true, data: data as Order[] };
}
