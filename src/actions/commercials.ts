"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { verifyAdmin } from "@/lib/auth-helpers";
import {
  courierSchema,
  updateCourierSchema,
  type ActionResponse,
  type Customer,
  type User,
} from "@/types";
import { logOperacion, logError } from "@/lib/logger";

export async function listAllCommercials(): Promise<ActionResponse<User[]>> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const { data, error } = await ctx.supabase
    .from("users")
    .select("*")
    .eq("role", "commercial")
    .eq("admin_id", ctx.user.id)
    .order("name");

  if (error) {
    logError("list_commercials", error);
    return { success: false, error: "Error fetching commercials" };
  }

  return { success: true, data: data as User[] };
}

export async function createCommercial(
  _prevState: ActionResponse,
  formData: FormData
): Promise<ActionResponse> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const result = courierSchema.safeParse(raw);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  const admin = createServiceRoleClient();
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: result.data.email,
    password: result.data.password,
    email_confirm: true,
  });

  if (authError) {
    logError("create_commercial_auth", authError);
    if (authError.message.includes("already been registered")) {
      return { success: false, error: "Este email ya esta registrado" };
    }
    return { success: false, error: "Error al crear usuario de autenticacion" };
  }

  const { error: insertError } = await admin.from("users").insert({
    id: authData.user.id,
    email: result.data.email,
    name: result.data.name,
    role: "commercial",
    active: true,
    admin_id: ctx.user.id,
  });

  if (insertError) {
    await admin.auth.admin.deleteUser(authData.user.id);
    logError("create_commercial_insert", insertError);
    return { success: false, error: "Error al registrar comercial" };
  }

  logOperacion(
    "commercial_created",
    { commercial_id: authData.user.id, name: result.data.name },
    ctx.user.id
  );

  revalidatePath("/commercials");
  return { success: true };
}

export async function updateCommercial(
  commercialId: string,
  _prevState: ActionResponse,
  formData: FormData
): Promise<ActionResponse> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
  };

  const result = updateCourierSchema.safeParse(raw);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  // Ensure target belongs to current admin
  const { data: target } = await ctx.supabase
    .from("users")
    .select("id")
    .eq("id", commercialId)
    .eq("role", "commercial")
    .eq("admin_id", ctx.user.id)
    .single();

  if (!target) return { success: false, error: "Comercial no encontrado" };

  const { error } = await ctx.supabase
    .from("users")
    .update({ name: result.data.name, email: result.data.email })
    .eq("id", commercialId);

  if (error) {
    logError("update_commercial", error, { commercial_id: commercialId });
    return { success: false, error: "Error al actualizar comercial" };
  }

  const admin = createServiceRoleClient();
  await admin.auth.admin.updateUserById(commercialId, {
    email: result.data.email,
  });

  logOperacion(
    "commercial_updated",
    { commercial_id: commercialId, ...result.data },
    ctx.user.id
  );

  revalidatePath("/commercials");
  return { success: true };
}

export async function toggleCommercialActive(
  commercialId: string
): Promise<ActionResponse> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const { data: commercial } = await ctx.supabase
    .from("users")
    .select("active, name")
    .eq("id", commercialId)
    .eq("role", "commercial")
    .eq("admin_id", ctx.user.id)
    .single();

  if (!commercial) return { success: false, error: "Comercial no encontrado" };

  const newActive = !commercial.active;

  const { error } = await ctx.supabase
    .from("users")
    .update({ active: newActive })
    .eq("id", commercialId);

  if (error) {
    logError("toggle_commercial_active", error, { commercial_id: commercialId });
    return { success: false, error: "Error al cambiar estado" };
  }

  logOperacion(
    newActive ? "commercial_activated" : "commercial_deactivated",
    { commercial_id: commercialId },
    ctx.user.id
  );

  revalidatePath("/commercials");
  return { success: true };
}

export async function getCommercialCustomers(
  commercialId: string
): Promise<ActionResponse<Customer[]>> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const { data, error } = await ctx.supabase
    .from("customers")
    .select("*")
    .eq("commercial_id", commercialId)
    .eq("admin_id", ctx.user.id)
    .eq("active", true)
    .order("name");

  if (error) {
    logError("get_commercial_customers", error, { commercial_id: commercialId });
    return { success: false, error: "Error fetching customers" };
  }

  return { success: true, data: data as Customer[] };
}

export async function assignCustomerToCommercial(
  customerId: string,
  commercialId: string | null
): Promise<ActionResponse> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  // Validate customer belongs to this admin
  const { data: customer } = await ctx.supabase
    .from("customers")
    .select("id")
    .eq("id", customerId)
    .eq("admin_id", ctx.user.id)
    .single();

  if (!customer) return { success: false, error: "Cliente no encontrado" };

  // Validate commercial belongs to this admin and is active (if provided)
  if (commercialId) {
    const { data: commercial } = await ctx.supabase
      .from("users")
      .select("id, active")
      .eq("id", commercialId)
      .eq("role", "commercial")
      .eq("admin_id", ctx.user.id)
      .single();

    if (!commercial) return { success: false, error: "Comercial no válido" };
    if (!commercial.active) {
      return { success: false, error: "Comercial inactivo" };
    }
  }

  const { error } = await ctx.supabase
    .from("customers")
    .update({ commercial_id: commercialId })
    .eq("id", customerId);

  if (error) {
    logError("assign_customer_to_commercial", error, {
      customer_id: customerId,
      commercial_id: commercialId,
    });
    return { success: false, error: "Error al asignar comercial" };
  }

  logOperacion(
    "customer_commercial_assigned",
    { customer_id: customerId, commercial_id: commercialId },
    ctx.user.id
  );

  revalidatePath("/customers");
  revalidatePath("/commercials");
  return { success: true };
}
