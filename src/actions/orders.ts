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

  const { customer_id, items, notes } = result.data;

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

  // Deduct stock only for delivered quantities (total - returned)
  let allReturned = true;
  const deductedItems: { product_id: string; quantity: number }[] = [];

  for (const item of items) {
    const returnedQty = returnMap.get(item.id) ?? 0;
    const deliveredQty = item.quantity - returnedQty;

    if (deliveredQty > 0) {
      allReturned = false;

      const { data: stockResult, error: stockError } = await ctx.supabase
        .rpc("deduct_stock", {
          p_product_id: item.product_id,
          p_quantity: deliveredQty,
          p_order_reference: orderId,
        });

      if (stockError || stockResult === false) {
        // Rollback previously deducted items
        for (const deducted of deductedItems) {
          await ctx.supabase.rpc("return_stock", {
            p_product_id: deducted.product_id,
            p_quantity: deducted.quantity,
            p_order_reference: orderId,
          });
        }
        logError("confirm_delivery_stock", stockError, { order_id: orderId });
        return { success: false, error: "Error al descontar stock" };
      }

      deductedItems.push({ product_id: item.product_id, quantity: deliveredQty });
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

  logOperacion(hasReturns ? "delivery_confirmed_with_returns" : "delivery_confirmed", {
    order_id: orderId,
    status: finalStatus,
    returned_items: returnMap.size,
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
