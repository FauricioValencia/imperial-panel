"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { loginSchema, type ActionResponse, type User } from "@/types";
import { logAuth, logError } from "@/lib/logger";

export async function signIn(
  _prevState: ActionResponse,
  formData: FormData
): Promise<ActionResponse> {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const result = loginSchema.safeParse(raw);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: result.data.email,
    password: result.data.password,
  });

  if (error) {
    logError("sign_in_failed", error, { email: result.data.email });
    return { success: false, error: "Credenciales invalidas" };
  }

  const { data: user } = await supabase
    .from("users")
    .select("role, active")
    .eq("id", data.user.id)
    .single();

  if (!user) {
    await supabase.auth.signOut();
    return { success: false, error: "Usuario no registrado en el sistema" };
  }

  if (!user.active) {
    await supabase.auth.signOut();
    return { success: false, error: "Usuario desactivado. Contacte al administrador." };
  }

  logAuth("sign_in_success", data.user.id);

  if (user.role === "courier") {
    redirect("/deliveries");
  }

  redirect("/dashboard");
}

export async function signOut(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    logAuth("sign_out", user.id);
  }

  await supabase.auth.signOut();
  redirect("/login");
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: userData } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  return userData;
}
