"use server";

import { revalidatePath } from "next/cache";
import { crearClienteSupabaseServer } from "@/lib/supabase/server";
import { clienteSchema, type ActionResponse, type Cliente } from "@/types";
import { logOperacion, logError } from "@/lib/logger";

async function verificarAdmin() {
  const supabase = await crearClienteSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("id, rol")
    .eq("id", user.id)
    .single();

  if (!usuario || usuario.rol !== "admin") return null;

  return { supabase, usuario };
}

export async function listarClientes(busqueda?: string): Promise<ActionResponse<Cliente[]>> {
  const ctx = await verificarAdmin();
  if (!ctx) return { success: false, error: "No autorizado" };

  let query = ctx.supabase
    .from("clientes")
    .select("*")
    .eq("activo", true)
    .order("nombre", { ascending: true });

  if (busqueda) {
    query = query.or(`nombre.ilike.%${busqueda}%,telefono.ilike.%${busqueda}%,direccion.ilike.%${busqueda}%`);
  }

  const { data, error } = await query;

  if (error) {
    logError("listar_clientes", error);
    return { success: false, error: "Error al obtener clientes" };
  }

  return { success: true, data: data as Cliente[] };
}

export async function crearCliente(
  _prevState: ActionResponse,
  formData: FormData
): Promise<ActionResponse> {
  const ctx = await verificarAdmin();
  if (!ctx) return { success: false, error: "No autorizado" };

  const raw = {
    nombre: formData.get("nombre"),
    telefono: formData.get("telefono") || undefined,
    direccion: formData.get("direccion") || undefined,
  };

  const resultado = clienteSchema.safeParse(raw);
  if (!resultado.success) {
    return { success: false, error: resultado.error.issues[0].message };
  }

  const { data, error } = await ctx.supabase
    .from("clientes")
    .insert(resultado.data)
    .select()
    .single();

  if (error) {
    logError("crear_cliente", error);
    return { success: false, error: "Error al crear cliente" };
  }

  logOperacion("cliente_creado", { cliente_id: data.id, nombre: data.nombre }, ctx.usuario.id);
  revalidatePath("/clientes");
  return { success: true, data };
}

export async function editarCliente(
  clienteId: string,
  _prevState: ActionResponse,
  formData: FormData
): Promise<ActionResponse> {
  const ctx = await verificarAdmin();
  if (!ctx) return { success: false, error: "No autorizado" };

  const raw = {
    nombre: formData.get("nombre"),
    telefono: formData.get("telefono") || undefined,
    direccion: formData.get("direccion") || undefined,
  };

  const resultado = clienteSchema.safeParse(raw);
  if (!resultado.success) {
    return { success: false, error: resultado.error.issues[0].message };
  }

  const { error } = await ctx.supabase
    .from("clientes")
    .update(resultado.data)
    .eq("id", clienteId);

  if (error) {
    logError("editar_cliente", error, { cliente_id: clienteId });
    return { success: false, error: "Error al editar cliente" };
  }

  logOperacion("cliente_editado", { cliente_id: clienteId, ...resultado.data }, ctx.usuario.id);
  revalidatePath("/clientes");
  return { success: true };
}

export async function desactivarCliente(clienteId: string): Promise<ActionResponse> {
  const ctx = await verificarAdmin();
  if (!ctx) return { success: false, error: "No autorizado" };

  // Verificar que no tenga saldo pendiente
  const { data: cliente } = await ctx.supabase
    .from("clientes")
    .select("saldo_pendiente, nombre")
    .eq("id", clienteId)
    .single();

  if (cliente && cliente.saldo_pendiente > 0) {
    return {
      success: false,
      error: `No se puede desactivar: el cliente tiene saldo pendiente de $${cliente.saldo_pendiente}`,
    };
  }

  const { error } = await ctx.supabase
    .from("clientes")
    .update({ activo: false })
    .eq("id", clienteId);

  if (error) {
    logError("desactivar_cliente", error, { cliente_id: clienteId });
    return { success: false, error: "Error al desactivar cliente" };
  }

  logOperacion("cliente_desactivado", { cliente_id: clienteId }, ctx.usuario.id);
  revalidatePath("/clientes");
  return { success: true };
}
