"use server";

import { revalidatePath } from "next/cache";
import { crearClienteSupabaseServer } from "@/lib/supabase/server";
import {
  productoSchema,
  type ActionResponse,
  type Producto,
  type MovimientoInventario,
} from "@/types";
import { logOperacion, logError } from "@/lib/logger";
import { z } from "zod";

const entradaInventarioSchema = z.object({
  producto_id: z.string().uuid(),
  cantidad: z.number().int().positive("Cantidad debe ser positiva"),
  notas: z.string().optional(),
});

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

export async function listarProductos(busqueda?: string): Promise<ActionResponse<Producto[]>> {
  const ctx = await verificarAdmin();
  if (!ctx) return { success: false, error: "No autorizado" };

  let query = ctx.supabase
    .from("productos")
    .select("*")
    .eq("activo", true)
    .order("nombre", { ascending: true });

  if (busqueda) {
    query = query.or(`nombre.ilike.%${busqueda}%,descripcion.ilike.%${busqueda}%`);
  }

  const { data, error } = await query;

  if (error) {
    logError("listar_productos", error);
    return { success: false, error: "Error al obtener productos" };
  }

  return { success: true, data: data as Producto[] };
}

export async function crearProducto(
  _prevState: ActionResponse,
  formData: FormData
): Promise<ActionResponse> {
  const ctx = await verificarAdmin();
  if (!ctx) return { success: false, error: "No autorizado" };

  const raw = {
    nombre: formData.get("nombre"),
    descripcion: formData.get("descripcion") || undefined,
    precio: Number(formData.get("precio")),
    stock: Number(formData.get("stock")),
    stock_minimo: Number(formData.get("stock_minimo")) || 5,
  };

  const resultado = productoSchema.safeParse(raw);
  if (!resultado.success) {
    return { success: false, error: resultado.error.issues[0].message };
  }

  const { data, error } = await ctx.supabase
    .from("productos")
    .insert(resultado.data)
    .select()
    .single();

  if (error) {
    logError("crear_producto", error);
    return { success: false, error: "Error al crear producto" };
  }

  // Registrar movimiento de entrada inicial si hay stock
  if (resultado.data.stock > 0) {
    await ctx.supabase.from("movimientos_inventario").insert({
      producto_id: data.id,
      tipo: "entrada",
      cantidad: resultado.data.stock,
      notas: "Stock inicial al crear producto",
    });
  }

  logOperacion("producto_creado", { producto_id: data.id, nombre: data.nombre }, ctx.usuario.id);
  revalidatePath("/inventario");
  return { success: true, data };
}

export async function editarProducto(
  productoId: string,
  _prevState: ActionResponse,
  formData: FormData
): Promise<ActionResponse> {
  const ctx = await verificarAdmin();
  if (!ctx) return { success: false, error: "No autorizado" };

  const raw = {
    nombre: formData.get("nombre"),
    descripcion: formData.get("descripcion") || undefined,
    precio: Number(formData.get("precio")),
    stock: Number(formData.get("stock")),
    stock_minimo: Number(formData.get("stock_minimo")) || 5,
  };

  const resultado = productoSchema.safeParse(raw);
  if (!resultado.success) {
    return { success: false, error: resultado.error.issues[0].message };
  }

  // No actualizar stock directamente, solo datos basicos
  const { stock: _stock, ...datosActualizar } = resultado.data;

  const { error } = await ctx.supabase
    .from("productos")
    .update(datosActualizar)
    .eq("id", productoId);

  if (error) {
    logError("editar_producto", error, { producto_id: productoId });
    return { success: false, error: "Error al editar producto" };
  }

  logOperacion("producto_editado", { producto_id: productoId, ...datosActualizar }, ctx.usuario.id);
  revalidatePath("/inventario");
  return { success: true };
}

export async function desactivarProducto(productoId: string): Promise<ActionResponse> {
  const ctx = await verificarAdmin();
  if (!ctx) return { success: false, error: "No autorizado" };

  const { error } = await ctx.supabase
    .from("productos")
    .update({ activo: false })
    .eq("id", productoId);

  if (error) {
    logError("desactivar_producto", error, { producto_id: productoId });
    return { success: false, error: "Error al desactivar producto" };
  }

  logOperacion("producto_desactivado", { producto_id: productoId }, ctx.usuario.id);
  revalidatePath("/inventario");
  return { success: true };
}

export async function registrarEntradaInventario(
  _prevState: ActionResponse,
  formData: FormData
): Promise<ActionResponse> {
  const ctx = await verificarAdmin();
  if (!ctx) return { success: false, error: "No autorizado" };

  const raw = {
    producto_id: formData.get("producto_id") as string,
    cantidad: Number(formData.get("cantidad")),
    notas: (formData.get("notas") as string) || undefined,
  };

  const resultado = entradaInventarioSchema.safeParse(raw);
  if (!resultado.success) {
    return { success: false, error: resultado.error.issues[0].message };
  }

  // Actualizar stock del producto
  const { data: producto } = await ctx.supabase
    .from("productos")
    .select("stock, nombre")
    .eq("id", resultado.data.producto_id)
    .single();

  if (!producto) {
    return { success: false, error: "Producto no encontrado" };
  }

  const nuevoStock = producto.stock + resultado.data.cantidad;

  const { error: errorUpdate } = await ctx.supabase
    .from("productos")
    .update({ stock: nuevoStock })
    .eq("id", resultado.data.producto_id);

  if (errorUpdate) {
    logError("registrar_entrada", errorUpdate);
    return { success: false, error: "Error al actualizar stock" };
  }

  // Registrar movimiento
  const { error: errorMov } = await ctx.supabase
    .from("movimientos_inventario")
    .insert({
      producto_id: resultado.data.producto_id,
      tipo: "entrada",
      cantidad: resultado.data.cantidad,
      notas: resultado.data.notas || "Entrada manual de inventario",
    });

  if (errorMov) {
    logError("registrar_movimiento_entrada", errorMov);
  }

  logOperacion(
    "entrada_inventario",
    {
      producto_id: resultado.data.producto_id,
      producto_nombre: producto.nombre,
      cantidad: resultado.data.cantidad,
      stock_anterior: producto.stock,
      stock_nuevo: nuevoStock,
    },
    ctx.usuario.id
  );

  revalidatePath("/inventario");
  return { success: true };
}

export async function listarMovimientos(
  productoId: string
): Promise<ActionResponse<MovimientoInventario[]>> {
  const ctx = await verificarAdmin();
  if (!ctx) return { success: false, error: "No autorizado" };

  const { data, error } = await ctx.supabase
    .from("movimientos_inventario")
    .select("*")
    .eq("producto_id", productoId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    logError("listar_movimientos", error);
    return { success: false, error: "Error al obtener movimientos" };
  }

  return { success: true, data: data as MovimientoInventario[] };
}
