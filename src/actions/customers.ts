"use server";

import { revalidatePath } from "next/cache";
import { verifyAdmin } from "@/lib/auth-helpers";
import { customerSchema, type ActionResponse, type Customer } from "@/types";
import { logOperacion, logError } from "@/lib/logger";

export async function listCustomers(search?: string): Promise<ActionResponse<Customer[]>> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  let query = ctx.supabase
    .from("customers")
    .select("*")
    .eq("active", true)
    .order("name", { ascending: true });

  if (search) {
    query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,address.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    logError("list_customers", error);
    return { success: false, error: "Error fetching customers" };
  }

  return { success: true, data: data as Customer[] };
}

export async function createCustomer(
  _prevState: ActionResponse,
  formData: FormData
): Promise<ActionResponse> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const raw = {
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
    address: formData.get("address") || undefined,
  };

  const result = customerSchema.safeParse(raw);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  const { data, error } = await ctx.supabase
    .from("customers")
    .insert({ ...result.data, admin_id: ctx.user.id })
    .select()
    .single();

  if (error) {
    logError("create_customer", error);
    return { success: false, error: "Error creating customer" };
  }

  logOperacion("customer_created", { customer_id: data.id, name: data.name }, ctx.user.id);
  revalidatePath("/customers");
  return { success: true, data };
}

export async function updateCustomer(
  customerId: string,
  _prevState: ActionResponse,
  formData: FormData
): Promise<ActionResponse> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const raw = {
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
    address: formData.get("address") || undefined,
  };

  const result = customerSchema.safeParse(raw);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  const { error } = await ctx.supabase
    .from("customers")
    .update(result.data)
    .eq("id", customerId);

  if (error) {
    logError("update_customer", error, { customer_id: customerId });
    return { success: false, error: "Error updating customer" };
  }

  logOperacion("customer_updated", { customer_id: customerId, ...result.data }, ctx.user.id);
  revalidatePath("/customers");
  return { success: true };
}

export async function deactivateCustomer(customerId: string): Promise<ActionResponse> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const { data: customer } = await ctx.supabase
    .from("customers")
    .select("pending_balance, name")
    .eq("id", customerId)
    .single();

  if (customer && customer.pending_balance > 0) {
    return {
      success: false,
      error: `Cannot deactivate: customer has pending balance of $${customer.pending_balance}`,
    };
  }

  const { error } = await ctx.supabase
    .from("customers")
    .update({ active: false })
    .eq("id", customerId);

  if (error) {
    logError("deactivate_customer", error, { customer_id: customerId });
    return { success: false, error: "Error deactivating customer" };
  }

  logOperacion("customer_deactivated", { customer_id: customerId }, ctx.user.id);
  revalidatePath("/customers");
  return { success: true };
}
