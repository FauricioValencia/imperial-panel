"use server";

import { redirect } from "next/navigation";
import { crearClienteSupabaseServer } from "@/lib/supabase/server";
import { loginSchema, type ActionResponse, type Usuario } from "@/types";
import { logAuth, logError } from "@/lib/logger";

export async function iniciarSesion(
  _prevState: ActionResponse,
  formData: FormData
): Promise<ActionResponse> {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const resultado = loginSchema.safeParse(raw);
  if (!resultado.success) {
    return { success: false, error: resultado.error.issues[0].message };
  }

  const supabase = await crearClienteSupabaseServer();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: resultado.data.email,
    password: resultado.data.password,
  });

  if (error) {
    logError("login_fallido", error, { email: resultado.data.email });
    return { success: false, error: "Credenciales invalidas" };
  }

  // Obtener rol del usuario
  const { data: usuario } = await supabase
    .from("usuarios")
    .select("rol, activo")
    .eq("id", data.user.id)
    .single();

  if (!usuario) {
    await supabase.auth.signOut();
    return { success: false, error: "Usuario no registrado en el sistema" };
  }

  if (!usuario.activo) {
    await supabase.auth.signOut();
    return { success: false, error: "Usuario desactivado. Contacte al administrador." };
  }

  logAuth("login_exitoso", data.user.id);

  if (usuario.rol === "mensajero") {
    redirect("/entregas");
  }

  redirect("/dashboard");
}

export async function cerrarSesion(): Promise<void> {
  const supabase = await crearClienteSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    logAuth("logout", user.id);
  }

  await supabase.auth.signOut();
  redirect("/login");
}

export async function obtenerUsuarioActual(): Promise<Usuario | null> {
  const supabase = await crearClienteSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("*")
    .eq("id", user.id)
    .single();

  return usuario;
}
