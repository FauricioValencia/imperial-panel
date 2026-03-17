"use server";

import { revalidatePath } from "next/cache";
import { verifyAdmin } from "@/lib/auth-helpers";
import { zoneSchema, type ActionResponse, type Zone } from "@/types";
import { logOperacion, logError } from "@/lib/logger";

export async function listZones(): Promise<ActionResponse<Zone[]>> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const { data, error } = await ctx.supabase
    .from("zones")
    .select("*")
    .eq("admin_id", ctx.user.id)
    .eq("active", true)
    .order("name", { ascending: true });

  if (error) {
    logError("list_zones", error);
    return { success: false, error: "Error al obtener zonas" };
  }

  return { success: true, data: data as Zone[] };
}

export async function createZone(
  _prevState: ActionResponse,
  formData: FormData
): Promise<ActionResponse> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const raw = {
    name: formData.get("name"),
    description: (formData.get("description") as string) || undefined,
  };

  const result = zoneSchema.safeParse(raw);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  const { data, error } = await ctx.supabase
    .from("zones")
    .insert({ ...result.data, admin_id: ctx.user.id })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Ya existe una zona con ese nombre" };
    }
    logError("create_zone", error);
    return { success: false, error: "Error al crear zona" };
  }

  logOperacion("zone_created", { zone_id: data.id, name: data.name }, ctx.user.id);
  revalidatePath("/zones");
  return { success: true, data };
}

export async function updateZone(
  zoneId: string,
  _prevState: ActionResponse,
  formData: FormData
): Promise<ActionResponse> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const raw = {
    name: formData.get("name"),
    description: (formData.get("description") as string) || undefined,
  };

  const result = zoneSchema.safeParse(raw);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  // Verificar ownership explícitamente para dar error claro (RLS daría fallo silencioso)
  const { data: existing } = await ctx.supabase
    .from("zones")
    .select("id")
    .eq("id", zoneId)
    .eq("admin_id", ctx.user.id)
    .single();

  if (!existing) {
    return { success: false, error: "Zona no encontrada" };
  }

  const { error } = await ctx.supabase
    .from("zones")
    .update(result.data)
    .eq("id", zoneId)
    .eq("admin_id", ctx.user.id);

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Ya existe una zona con ese nombre" };
    }
    logError("update_zone", error, { zone_id: zoneId });
    return { success: false, error: "Error al actualizar zona" };
  }

  logOperacion("zone_updated", { zone_id: zoneId, ...result.data }, ctx.user.id);
  revalidatePath("/zones");
  return { success: true };
}

export async function deactivateZone(zoneId: string): Promise<ActionResponse> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  // Verificar ownership explícitamente
  const { data: existing } = await ctx.supabase
    .from("zones")
    .select("id, name")
    .eq("id", zoneId)
    .eq("admin_id", ctx.user.id)
    .single();

  if (!existing) {
    return { success: false, error: "Zona no encontrada" };
  }

  // Limpiar zone_id en domiciliarios asignados a esta zona (verificar error)
  const { error: clearError } = await ctx.supabase
    .from("users")
    .update({ zone_id: null })
    .eq("zone_id", zoneId)
    .eq("admin_id", ctx.user.id);

  if (clearError) {
    logError("deactivate_zone_clear_couriers", clearError, { zone_id: zoneId });
    return { success: false, error: "Error al desasignar domiciliarios de la zona" };
  }

  const { error } = await ctx.supabase
    .from("zones")
    .update({ active: false })
    .eq("id", zoneId)
    .eq("admin_id", ctx.user.id);

  if (error) {
    logError("deactivate_zone", error, { zone_id: zoneId });
    return { success: false, error: "Error al desactivar zona" };
  }

  logOperacion("zone_deactivated", { zone_id: zoneId, name: existing.name }, ctx.user.id);
  revalidatePath("/zones");
  revalidatePath("/couriers");
  return { success: true };
}
