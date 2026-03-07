"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  registerPaymentSchema,
  type ActionResponse,
  type Payment,
  type Customer,
  type Order,
} from "@/types";
import { logOperacion, logError } from "@/lib/logger";

async function verifyAdmin() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: userData } = await supabase
    .from("users")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (!userData || userData.role !== "admin") return null;
  return { supabase, user: userData };
}

async function verifyAuth() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: userData } = await supabase
    .from("users")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (!userData) return null;
  return { supabase, user: userData };
}

// List customers with pending balances (billing overview)
export async function listBillingCustomers(): Promise<ActionResponse<Customer[]>> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const { data, error } = await ctx.supabase
    .from("customers")
    .select("*")
    .eq("active", true)
    .order("pending_balance", { ascending: false });

  if (error) {
    logError("list_billing_customers", error);
    return { success: false, error: "Error fetching customers" };
  }

  return { success: true, data: data as Customer[] };
}

// Get customer billing detail: orders + payments
interface CustomerBillingDetail {
  customer: Customer;
  orders: Order[];
  payments: Payment[];
  total_billed: number;
  total_paid: number;
}

export async function getCustomerBilling(
  customerId: string
): Promise<ActionResponse<CustomerBillingDetail>> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  // Fetch customer
  const { data: customer, error: customerError } = await ctx.supabase
    .from("customers")
    .select("*")
    .eq("id", customerId)
    .single();

  if (customerError || !customer) {
    return { success: false, error: "Customer not found" };
  }

  // Fetch delivered/partial orders for this customer
  const { data: orders, error: ordersError } = await ctx.supabase
    .from("orders")
    .select(`
      *,
      courier:users!courier_id(id, name),
      items:order_items(id, quantity, unit_price, returned, returned_quantity, product:products!product_id(name))
    `)
    .eq("customer_id", customerId)
    .in("status", ["delivered", "partial", "assigned", "in_transit"])
    .order("created_at", { ascending: false });

  if (ordersError) {
    logError("get_customer_billing_orders", ordersError);
    return { success: false, error: "Error fetching orders" };
  }

  // Fetch payments
  const { data: payments, error: paymentsError } = await ctx.supabase
    .from("payments")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (paymentsError) {
    logError("get_customer_billing_payments", paymentsError);
    return { success: false, error: "Error fetching payments" };
  }

  const total_billed = (orders as Order[]).reduce((sum, o) => sum + o.total, 0);
  const total_paid = (payments as Payment[]).reduce((sum, p) => sum + p.amount, 0);

  return {
    success: true,
    data: {
      customer: customer as Customer,
      orders: orders as Order[],
      payments: payments as Payment[],
      total_billed,
      total_paid,
    },
  };
}

// Register a payment (admin or courier)
export async function registerPayment(input: {
  order_id: string;
  amount: number;
  type: "full" | "partial";
  payment_method: "cash" | "transfer" | "nequi" | "daviplata";
}): Promise<ActionResponse> {
  const ctx = await verifyAuth();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const validation = registerPaymentSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0].message };
  }

  const { order_id, amount, type, payment_method } = validation.data;

  // Get the order to find customer_id
  const { data: order, error: orderError } = await ctx.supabase
    .from("orders")
    .select("id, customer_id, total, status")
    .eq("id", order_id)
    .single();

  if (orderError || !order) {
    return { success: false, error: "Pedido no encontrado" };
  }

  // Validate amount against remaining balance for full payments
  if (type === "full") {
    const { data: existingPayments } = await ctx.supabase
      .from("payments")
      .select("amount")
      .eq("order_id", order_id);

    const totalPaid = (existingPayments || []).reduce(
      (sum: number, p: { amount: number }) => sum + p.amount, 0
    );
    const remaining = order.total - totalPaid;

    if (amount > remaining + 0.01) {
      return {
        success: false,
        error: `El monto excede el saldo pendiente (${remaining.toLocaleString("es-CO")})`,
      };
    }
  }

  // Insert payment
  const { error: paymentError } = await ctx.supabase
    .from("payments")
    .insert({
      order_id,
      customer_id: order.customer_id,
      amount,
      type,
      payment_method,
      registered_by: ctx.user.id,
    });

  if (paymentError) {
    logError("register_payment", paymentError, { order_id });
    return { success: false, error: "Error al registrar pago" };
  }

  // Update customer balance via RPC
  const { error: balanceError } = await ctx.supabase.rpc("update_customer_balance", {
    p_customer_id: order.customer_id,
  });

  if (balanceError) {
    logError("register_payment_balance", balanceError, { customer_id: order.customer_id });
  }

  logOperacion("payment_registered", {
    order_id,
    customer_id: order.customer_id,
    amount,
    type,
    payment_method,
  }, ctx.user.id);

  revalidatePath("/billing");
  revalidatePath("/orders");
  revalidatePath("/deliveries");
  return { success: true };
}

// List payments for an order
export async function listOrderPayments(
  orderId: string
): Promise<ActionResponse<Payment[]>> {
  const ctx = await verifyAuth();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const { data, error } = await ctx.supabase
    .from("payments")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });

  if (error) {
    logError("list_order_payments", error);
    return { success: false, error: "Error fetching payments" };
  }

  return { success: true, data: data as Payment[] };
}
