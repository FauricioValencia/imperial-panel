"use server";

import { revalidatePath } from "next/cache";
import { verifyAuth } from "@/lib/auth-helpers";
import { businessConfigSchema, type ActionResponse, type BusinessConfig } from "@/types";
import { logOperacion, logError } from "@/lib/logger";

/** Verify user is admin or super_admin */
async function verifyAdminOrSuper() {
  const ctx = await verifyAuth();
  if (!ctx) return null;
  if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") return null;
  return ctx;
}

export async function getBusinessConfig(): Promise<ActionResponse<BusinessConfig>> {
  const ctx = await verifyAdminOrSuper();
  if (!ctx) return { success: false, error: "Unauthorized" };

  let query = ctx.supabase.from("business_config").select("*");

  // Admin sees their own config; super_admin sees first one (for global panel)
  if (ctx.user.role === "admin") {
    query = query.eq("admin_id", ctx.user.id);
  }

  const { data, error } = await query.limit(1).single();

  if (error) {
    logError("get_business_config", error);
    return { success: false, error: "Error al obtener configuracion" };
  }

  return { success: true, data: data as BusinessConfig };
}

export async function updateBusinessConfig(
  _prevState: ActionResponse,
  formData: FormData
): Promise<ActionResponse> {
  const ctx = await verifyAdminOrSuper();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const raw = {
    company_name: formData.get("company_name"),
    tax_id: formData.get("tax_id") || undefined,
    phone: formData.get("phone") || undefined,
    address: formData.get("address") || undefined,
    payment_terms: formData.get("payment_terms") || undefined,
    logo_url: formData.get("logo_url") || undefined,
  };

  const result = businessConfigSchema.safeParse(raw);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  let existingQuery = ctx.supabase.from("business_config").select("id");
  if (ctx.user.role === "admin") {
    existingQuery = existingQuery.eq("admin_id", ctx.user.id);
  }
  const { data: existing } = await existingQuery.limit(1).single();

  if (!existing) {
    return { success: false, error: "No se encontro configuracion" };
  }

  const { error } = await ctx.supabase
    .from("business_config")
    .update({ ...result.data, updated_at: new Date().toISOString() })
    .eq("id", existing.id);

  if (error) {
    logError("update_business_config", error);
    return { success: false, error: "Error al actualizar configuracion" };
  }

  logOperacion("business_config_updated", result.data, ctx.user.id);
  revalidatePath("/admin-panel/config");
  return { success: true };
}

export async function uploadLogo(formData: FormData): Promise<ActionResponse<string>> {
  const ctx = await verifyAdminOrSuper();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const file = formData.get("logo") as File | null;
  if (!file || file.size === 0) {
    return { success: false, error: "No se selecciono archivo" };
  }

  if (file.size > 2 * 1024 * 1024) {
    return { success: false, error: "El archivo no debe superar 2MB" };
  }

  if (!file.type.startsWith("image/")) {
    return { success: false, error: "El archivo debe ser una imagen" };
  }

  const ext = file.name.split(".").pop() || "png";
  const fileName = `logo-${Date.now()}.${ext}`;

  const { error: uploadError } = await ctx.supabase.storage
    .from("logos")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    logError("upload_logo", uploadError);
    return { success: false, error: "Error al subir logo" };
  }

  const { data: urlData } = ctx.supabase.storage
    .from("logos")
    .getPublicUrl(fileName);

  const logoUrl = urlData.publicUrl;

  let logoQuery = ctx.supabase.from("business_config").select("id");
  if (ctx.user.role === "admin") {
    logoQuery = logoQuery.eq("admin_id", ctx.user.id);
  }
  const { data: existing } = await logoQuery.limit(1).single();

  if (existing) {
    await ctx.supabase
      .from("business_config")
      .update({ logo_url: logoUrl, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
  }

  logOperacion("logo_uploaded", { logo_url: logoUrl }, ctx.user.id);
  revalidatePath("/admin-panel/config");
  return { success: true, data: logoUrl };
}
