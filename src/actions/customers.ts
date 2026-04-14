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

  const rawCourierId = formData.get("preferred_courier_id") as string | null;
  const rawCommercialId = formData.get("commercial_id") as string | null;

  const raw = {
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
    address: formData.get("address") || undefined,
    reference_code: (formData.get("reference_code") as string) || undefined,
    preferred_courier_id: rawCourierId || undefined,
    commercial_id: rawCommercialId || undefined,
  };

  const result = customerSchema.safeParse(raw);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  // Verificar que el domiciliario preferido pertenece al mismo admin
  if (result.data.preferred_courier_id) {
    const { data: courier } = await ctx.supabase
      .from("users")
      .select("id")
      .eq("id", result.data.preferred_courier_id)
      .eq("admin_id", ctx.user.id)
      .eq("role", "courier")
      .single();

    if (!courier) {
      return { success: false, error: "Domiciliario no válido" };
    }
  }

  // Verificar que el comercial pertenece al mismo admin y está activo
  if (result.data.commercial_id) {
    const { data: commercial } = await ctx.supabase
      .from("users")
      .select("id, active")
      .eq("id", result.data.commercial_id)
      .eq("admin_id", ctx.user.id)
      .eq("role", "commercial")
      .single();

    if (!commercial || !commercial.active) {
      return { success: false, error: "Comercial no válido" };
    }
  }

  const dataToInsert = {
    ...result.data,
    reference_code: result.data.reference_code?.toUpperCase() ?? null,
    admin_id: ctx.user.id,
  };

  const { data, error } = await ctx.supabase
    .from("customers")
    .insert(dataToInsert)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Ya existe un cliente con ese código de referencia" };
    }
    logError("create_customer", error);
    return { success: false, error: "Error al crear cliente" };
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

  const rawCourierId = formData.get("preferred_courier_id") as string | null;
  const rawCommercialId = formData.get("commercial_id") as string | null;

  const raw = {
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
    address: formData.get("address") || undefined,
    reference_code: (formData.get("reference_code") as string) || undefined,
    preferred_courier_id: rawCourierId || undefined,
    commercial_id: rawCommercialId || undefined,
  };

  const result = customerSchema.safeParse(raw);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  // Verificar que el domiciliario preferido pertenece al mismo admin
  if (result.data.preferred_courier_id) {
    const { data: courier } = await ctx.supabase
      .from("users")
      .select("id")
      .eq("id", result.data.preferred_courier_id)
      .eq("admin_id", ctx.user.id)
      .eq("role", "courier")
      .single();

    if (!courier) {
      return { success: false, error: "Domiciliario no válido" };
    }
  }

  // Verificar que el comercial pertenece al mismo admin y está activo
  if (result.data.commercial_id) {
    const { data: commercial } = await ctx.supabase
      .from("users")
      .select("id, active")
      .eq("id", result.data.commercial_id)
      .eq("admin_id", ctx.user.id)
      .eq("role", "commercial")
      .single();

    if (!commercial || !commercial.active) {
      return { success: false, error: "Comercial no válido" };
    }
  }

  const dataToUpdate = {
    ...result.data,
    reference_code: result.data.reference_code?.toUpperCase() ?? null,
    // Si se envía vacío, limpiar los campos
    preferred_courier_id: result.data.preferred_courier_id ?? null,
    commercial_id: result.data.commercial_id ?? null,
  };

  const { error } = await ctx.supabase
    .from("customers")
    .update(dataToUpdate)
    .eq("id", customerId);

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Ya existe un cliente con ese código de referencia" };
    }
    logError("update_customer", error, { customer_id: customerId });
    return { success: false, error: "Error al actualizar cliente" };
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
