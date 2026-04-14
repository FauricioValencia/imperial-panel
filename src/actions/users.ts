"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { verifySuperAdmin } from "@/lib/auth-helpers";
import {
  createUserSchema,
  updateUserSchema,
  type ActionResponse,
  type User,
} from "@/types";
import { logOperacion, logError } from "@/lib/logger";

export async function listUsers(): Promise<ActionResponse<User[]>> {
  const ctx = await verifySuperAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const { data, error } = await ctx.supabase
    .from("users")
    .select("*")
    .in("role", ["admin", "courier", "commercial"])
    .order("role")
    .order("name");

  if (error) {
    logError("list_users", error);
    return { success: false, error: "Error al obtener usuarios" };
  }

  return { success: true, data: data as User[] };
}

export async function createUser(
  _prevState: ActionResponse,
  formData: FormData
): Promise<ActionResponse> {
  const ctx = await verifySuperAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  };

  const result = createUserSchema.safeParse(raw);
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
    logError("create_user_auth", authError);
    if (authError.message.includes("already been registered")) {
      return { success: false, error: "Este email ya esta registrado" };
    }
    return { success: false, error: "Error al crear usuario de autenticacion" };
  }

  // For admins: admin_id = their own id. For couriers: admin_id needs an assigned admin.
  const adminId = result.data.role === "admin" ? authData.user.id : null;

  const { error: insertError } = await admin
    .from("users")
    .insert({
      id: authData.user.id,
      email: result.data.email,
      name: result.data.name,
      role: result.data.role,
      active: true,
      admin_id: adminId,
    });

  if (insertError) {
    await admin.auth.admin.deleteUser(authData.user.id);
    logError("create_user_insert", insertError);
    return { success: false, error: "Error al registrar usuario" };
  }

  // Auto-create business_config for new admins
  if (result.data.role === "admin") {
    await admin.from("business_config").insert({
      company_name: result.data.name,
      admin_id: authData.user.id,
    });
  }

  logOperacion("user_created", {
    user_id: authData.user.id,
    name: result.data.name,
    role: result.data.role,
  }, ctx.user.id);

  revalidatePath("/admin-panel/users");
  return { success: true };
}

export async function updateUser(
  userId: string,
  _prevState: ActionResponse,
  formData: FormData
): Promise<ActionResponse> {
  const ctx = await verifySuperAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
  };

  const result = updateUserSchema.safeParse(raw);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  const { error } = await ctx.supabase
    .from("users")
    .update({ name: result.data.name, email: result.data.email })
    .eq("id", userId);

  if (error) {
    logError("update_user", error, { user_id: userId });
    return { success: false, error: "Error al actualizar usuario" };
  }

  const admin = createServiceRoleClient();
  await admin.auth.admin.updateUserById(userId, {
    email: result.data.email,
  });

  logOperacion("user_updated", {
    user_id: userId,
    ...result.data,
  }, ctx.user.id);

  revalidatePath("/admin-panel/users");
  return { success: true };
}

export async function toggleUserActive(userId: string): Promise<ActionResponse> {
  const ctx = await verifySuperAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const { data: targetUser } = await ctx.supabase
    .from("users")
    .select("active, name, role")
    .eq("id", userId)
    .single();

  if (!targetUser) return { success: false, error: "Usuario no encontrado" };

  if (targetUser.role === "super_admin") {
    return { success: false, error: "No se puede desactivar un super admin" };
  }

  const newActive = !targetUser.active;

  const { error } = await ctx.supabase
    .from("users")
    .update({ active: newActive })
    .eq("id", userId);

  if (error) {
    logError("toggle_user_active", error, { user_id: userId });
    return { success: false, error: "Error al cambiar estado" };
  }

  logOperacion(newActive ? "user_activated" : "user_deactivated", {
    user_id: userId,
    name: targetUser.name,
  }, ctx.user.id);

  revalidatePath("/admin-panel/users");
  return { success: true };
}

export async function getUserStats(): Promise<ActionResponse<{ admins: number; couriers: number; active: number; inactive: number }>> {
  const ctx = await verifySuperAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const { data, error } = await ctx.supabase
    .from("users")
    .select("role, active")
    .in("role", ["admin", "courier", "commercial"]);

  if (error) {
    logError("get_user_stats", error);
    return { success: false, error: "Error al obtener estadisticas" };
  }

  const stats = {
    admins: data.filter(u => u.role === "admin").length,
    couriers: data.filter(u => u.role === "courier").length,
    active: data.filter(u => u.active).length,
    inactive: data.filter(u => !u.active).length,
  };

  return { success: true, data: stats };
}
