"use server";

import { revalidatePath } from "next/cache";
import { verifyAdmin, verifyAuth } from "@/lib/auth-helpers";
import {
  registerPaymentSchema,
  addManualChargeSchema,
  cancelManualChargeSchema,
  type ActionResponse,
  type Payment,
  type Customer,
  type CustomerCharge,
  type Order,
} from "@/types";
import { logOperacion, logError } from "@/lib/logger";

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

// Get customer billing detail: orders + payments + manual charges
interface CustomerBillingDetail {
  customer: Customer;
  orders: Order[];
  payments: Payment[];
  charges: CustomerCharge[];
  total_billed: number;
  total_paid: number;
  total_charges: number;
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

  const { data: charges, error: chargesError } = await ctx.supabase
    .from("customer_charges")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (chargesError) {
    logError("get_customer_billing_charges", chargesError);
    return { success: false, error: "Error fetching charges" };
  }

  const total_billed = (orders as Order[]).reduce((sum, o) => sum + o.total, 0);
  const total_paid = (payments as Payment[]).reduce((sum, p) => sum + p.amount, 0);
  const total_charges = (charges as CustomerCharge[])
    .filter((c) => c.cancelled_at == null)
    .reduce((sum, c) => sum + c.amount, 0);

  return {
    success: true,
    data: {
      customer: customer as Customer,
      orders: orders as Order[],
      payments: payments as Payment[],
      charges: charges as CustomerCharge[],
      total_billed,
      total_paid,
      total_charges,
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
      admin_id: ctx.user.admin_id ?? ctx.user.id,
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

// Add manual charge to a customer's wallet (admin only)
export async function addManualCharge(input: {
  customer_id: string;
  amount: number;
  charge_type: "legacy_debt" | "adjustment" | "late_fee" | "service" | "other";
  reason: string;
  due_date?: string;
}): Promise<ActionResponse<{ id: string }>> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const validation = addManualChargeSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0].message };
  }

  const { customer_id, amount, charge_type, reason, due_date } = validation.data;

  // Confirm the customer belongs to this admin and is active.
  const { data: customer, error: customerError } = await ctx.supabase
    .from("customers")
    .select("id, active, admin_id")
    .eq("id", customer_id)
    .single();

  if (customerError || !customer) {
    return { success: false, error: "Cliente no encontrado" };
  }
  if (!customer.active) {
    return { success: false, error: "Cliente inactivo" };
  }
  if (customer.admin_id !== ctx.user.id) {
    return { success: false, error: "Cliente no pertenece a este negocio" };
  }

  const { data: inserted, error: insertError } = await ctx.supabase
    .from("customer_charges")
    .insert({
      customer_id,
      admin_id: ctx.user.id,
      amount,
      charge_type,
      reason,
      due_date: due_date || null,
      created_by: ctx.user.id,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    logError("add_manual_charge", insertError, { customer_id, amount });
    return { success: false, error: "Error al registrar el cargo" };
  }

  const { error: balanceError } = await ctx.supabase.rpc("update_customer_balance", {
    p_customer_id: customer_id,
  });
  if (balanceError) {
    logError("add_manual_charge_balance", balanceError, { customer_id });
  }

  logOperacion(
    "manual_charge_added",
    { charge_id: inserted.id, customer_id, amount, charge_type, reason },
    ctx.user.id,
  );

  revalidatePath("/billing");
  revalidatePath(`/billing/${customer_id}`);
  return { success: true, data: { id: inserted.id } };
}

// Cancel (soft-delete) a manual charge (admin only)
export async function cancelManualCharge(input: {
  charge_id: string;
  cancel_reason: string;
}): Promise<ActionResponse> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const validation = cancelManualChargeSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0].message };
  }

  const { charge_id, cancel_reason } = validation.data;

  const { data: charge, error: fetchError } = await ctx.supabase
    .from("customer_charges")
    .select("id, customer_id, cancelled_at")
    .eq("id", charge_id)
    .single();

  if (fetchError || !charge) {
    return { success: false, error: "Cargo no encontrado" };
  }
  if (charge.cancelled_at) {
    return { success: false, error: "El cargo ya esta anulado" };
  }

  const { error: updateError } = await ctx.supabase
    .from("customer_charges")
    .update({
      cancelled_at: new Date().toISOString(),
      cancelled_by: ctx.user.id,
      cancel_reason,
    })
    .eq("id", charge_id)
    .is("cancelled_at", null);

  if (updateError) {
    logError("cancel_manual_charge", updateError, { charge_id });
    return { success: false, error: "Error al anular el cargo" };
  }

  const { error: balanceError } = await ctx.supabase.rpc("update_customer_balance", {
    p_customer_id: charge.customer_id,
  });
  if (balanceError) {
    logError("cancel_manual_charge_balance", balanceError, {
      customer_id: charge.customer_id,
    });
  }

  logOperacion(
    "manual_charge_cancelled",
    { charge_id, customer_id: charge.customer_id, cancel_reason },
    ctx.user.id,
  );

  revalidatePath("/billing");
  revalidatePath(`/billing/${charge.customer_id}`);
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
