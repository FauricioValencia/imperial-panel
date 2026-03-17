"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { verifyAdmin } from "@/lib/auth-helpers";
import {
  courierSchema,
  updateCourierSchema,
  type ActionResponse,
  type Order,
  type User,
} from "@/types";
import { logOperacion, logError } from "@/lib/logger";

export async function listAllCouriers(): Promise<ActionResponse<User[]>> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const { data, error } = await ctx.supabase
    .from("users")
    .select("*, zone:zones(id, name)")
    .eq("role", "courier")
    .eq("admin_id", ctx.user.id)
    .order("name");

  if (error) {
    logError("list_couriers", error);
    return { success: false, error: "Error fetching couriers" };
  }

  return { success: true, data: data as User[] };
}

export async function createCourier(
  _prevState: ActionResponse,
  formData: FormData
): Promise<ActionResponse> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    zone_id: (formData.get("zone_id") as string) || undefined,
  };

  const result = courierSchema.safeParse(raw);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  // Verificar que la zona pertenece al admin (si se especificó)
  if (result.data.zone_id) {
    const { data: zone } = await ctx.supabase
      .from("zones")
      .select("id")
      .eq("id", result.data.zone_id)
      .eq("admin_id", ctx.user.id)
      .single();

    if (!zone) {
      return { success: false, error: "Zona no válida" };
    }
  }

  // Create auth user via service role client
  const admin = createServiceRoleClient();
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: result.data.email,
    password: result.data.password,
    email_confirm: true,
  });

  if (authError) {
    logError("create_courier_auth", authError);
    if (authError.message.includes("already been registered")) {
      return { success: false, error: "Este email ya esta registrado" };
    }
    return { success: false, error: "Error al crear usuario de autenticacion" };
  }

  // Insert into users table (admin_id = creator admin's id)
  const { error: insertError } = await admin
    .from("users")
    .insert({
      id: authData.user.id,
      email: result.data.email,
      name: result.data.name,
      role: "courier",
      active: true,
      admin_id: ctx.user.id,
      zone_id: result.data.zone_id ?? null,
    });

  if (insertError) {
    // Rollback: delete auth user
    await admin.auth.admin.deleteUser(authData.user.id);
    logError("create_courier_insert", insertError);
    return { success: false, error: "Error al registrar domiciliario" };
  }

  logOperacion("courier_created", {
    courier_id: authData.user.id,
    name: result.data.name,
  }, ctx.user.id);

  revalidatePath("/couriers");
  return { success: true };
}

export async function updateCourier(
  courierId: string,
  _prevState: ActionResponse,
  formData: FormData
): Promise<ActionResponse> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    zone_id: (formData.get("zone_id") as string) || undefined,
  };

  const result = updateCourierSchema.safeParse(raw);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  // Verificar que la zona pertenece al admin (si se especificó)
  if (result.data.zone_id) {
    const { data: zone } = await ctx.supabase
      .from("zones")
      .select("id")
      .eq("id", result.data.zone_id)
      .eq("admin_id", ctx.user.id)
      .single();

    if (!zone) {
      return { success: false, error: "Zona no válida" };
    }
  }

  // Update users table
  const { error } = await ctx.supabase
    .from("users")
    .update({
      name: result.data.name,
      email: result.data.email,
      zone_id: result.data.zone_id ?? null,
    })
    .eq("id", courierId);

  if (error) {
    logError("update_courier", error, { courier_id: courierId });
    return { success: false, error: "Error al actualizar domiciliario" };
  }

  // Update email in auth if changed
  const admin = createServiceRoleClient();
  await admin.auth.admin.updateUserById(courierId, {
    email: result.data.email,
  });

  logOperacion("courier_updated", {
    courier_id: courierId,
    ...result.data,
  }, ctx.user.id);

  revalidatePath("/couriers");
  return { success: true };
}

export async function toggleCourierActive(courierId: string): Promise<ActionResponse> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  // Get current status
  const { data: courier } = await ctx.supabase
    .from("users")
    .select("active, name")
    .eq("id", courierId)
    .single();

  if (!courier) return { success: false, error: "Domiciliario no encontrado" };

  const newActive = !courier.active;

  const { error } = await ctx.supabase
    .from("users")
    .update({ active: newActive })
    .eq("id", courierId);

  if (error) {
    logError("toggle_courier_active", error, { courier_id: courierId });
    return { success: false, error: "Error al cambiar estado" };
  }

  logOperacion(newActive ? "courier_activated" : "courier_deactivated", {
    courier_id: courierId,
  }, ctx.user.id);

  revalidatePath("/couriers");
  return { success: true };
}

export async function getCourierDetail(
  courierId: string
): Promise<ActionResponse<User>> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const { data, error } = await ctx.supabase
    .from("users")
    .select("*")
    .eq("id", courierId)
    .eq("role", "courier")
    .single();

  if (error || !data) {
    return { success: false, error: "Domiciliario no encontrado" };
  }

  return { success: true, data: data as User };
}

export async function getCourierActiveRoute(
  courierId: string
): Promise<ActionResponse<Order[]>> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

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
    .eq("courier_id", courierId)
    .in("status", ["assigned", "in_transit"])
    .order("created_at", { ascending: false });

  if (error) {
    logError("get_courier_active_route", error, { courier_id: courierId });
    return { success: false, error: "Error fetching active route" };
  }

  return { success: true, data: data as Order[] };
}

export async function getCourierHistory(
  courierId: string
): Promise<ActionResponse<Order[]>> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

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
    .eq("courier_id", courierId)
    .in("status", ["delivered", "returned", "partial"])
    .order("delivered_at", { ascending: false })
    .limit(50);

  if (error) {
    logError("get_courier_history", error, { courier_id: courierId });
    return { success: false, error: "Error fetching courier history" };
  }

  return { success: true, data: data as Order[] };
}
