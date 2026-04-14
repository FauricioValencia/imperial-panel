"use server";

import { revalidatePath } from "next/cache";
import { verifyAdmin } from "@/lib/auth-helpers";
import {
  productSchema,
  registerOutboundSchema,
  type ActionResponse,
  type Product,
  type InventoryMovement,
} from "@/types";
import { logOperacion, logError } from "@/lib/logger";
import { z } from "zod";

const stockEntrySchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().int().positive("Quantity must be positive"),
  notes: z.string().optional(),
});

export async function listProducts(search?: string): Promise<ActionResponse<Product[]>> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  let query = ctx.supabase
    .from("products")
    .select("*")
    .eq("active", true)
    .order("name", { ascending: true });

  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    logError("list_products", error);
    return { success: false, error: "Error fetching products" };
  }

  return { success: true, data: data as Product[] };
}

export async function createProduct(
  _prevState: ActionResponse,
  formData: FormData
): Promise<ActionResponse> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const raw = {
    name: formData.get("name"),
    codigo: (formData.get("codigo") as string) || undefined,
    description: formData.get("description") || undefined,
    price: Number(formData.get("price")),
    stock: Number(formData.get("stock")),
    min_stock: Number(formData.get("min_stock")) || 5,
  };

  const result = productSchema.safeParse(raw);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  // Normalizar código a mayúsculas para consistencia
  const dataToInsert = {
    ...result.data,
    codigo: result.data.codigo?.toUpperCase() ?? null,
    admin_id: ctx.user.id,
  };

  const { data, error } = await ctx.supabase
    .from("products")
    .insert(dataToInsert)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Ya existe un producto con ese código" };
    }
    logError("create_product", error, { dataToInsert });
    return { success: false, error: `Error al crear producto: ${error.message}` };
  }

  if (result.data.stock > 0) {
    const { error: movError } = await ctx.supabase.from("inventory_movements").insert({
      product_id: data.id,
      type: "inbound",
      quantity: result.data.stock,
      notes: "Initial stock on product creation",
      admin_id: ctx.user.id,
    });
    if (movError) {
      logError("create_product_initial_movement", movError, { product_id: data.id });
    }
  }

  logOperacion("product_created", { product_id: data.id, name: data.name }, ctx.user.id);
  revalidatePath("/inventory");
  return { success: true, data };
}

export async function updateProduct(
  productId: string,
  _prevState: ActionResponse,
  formData: FormData
): Promise<ActionResponse> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const raw = {
    name: formData.get("name"),
    codigo: (formData.get("codigo") as string) || undefined,
    description: formData.get("description") || undefined,
    price: Number(formData.get("price")),
    stock: Number(formData.get("stock")),
    min_stock: Number(formData.get("min_stock")) || 5,
  };

  const result = productSchema.safeParse(raw);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  // Don't update stock directly, only basic data
  const { stock: _stock, ...rest } = result.data;
  const dataToUpdate = {
    ...rest,
    codigo: rest.codigo?.toUpperCase() ?? null,
  };

  const { error } = await ctx.supabase
    .from("products")
    .update(dataToUpdate)
    .eq("id", productId);

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Ya existe un producto con ese código" };
    }
    logError("update_product", error, { product_id: productId });
    return { success: false, error: "Error al actualizar producto" };
  }

  logOperacion("product_updated", { product_id: productId, ...dataToUpdate }, ctx.user.id);
  revalidatePath("/inventory");
  return { success: true };
}

export async function deactivateProduct(productId: string): Promise<ActionResponse> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const { error } = await ctx.supabase
    .from("products")
    .update({ active: false })
    .eq("id", productId);

  if (error) {
    logError("deactivate_product", error, { product_id: productId });
    return { success: false, error: "Error deactivating product" };
  }

  logOperacion("product_deactivated", { product_id: productId }, ctx.user.id);
  revalidatePath("/inventory");
  return { success: true };
}

export async function registerStockEntry(
  _prevState: ActionResponse,
  formData: FormData
): Promise<ActionResponse> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const raw = {
    product_id: formData.get("product_id") as string,
    quantity: Number(formData.get("quantity")),
    notes: (formData.get("notes") as string) || undefined,
  };

  const result = stockEntrySchema.safeParse(raw);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  // Get product info for logging
  const { data: product } = await ctx.supabase
    .from("products")
    .select("stock, name")
    .eq("id", result.data.product_id)
    .single();

  if (!product) {
    return { success: false, error: "Product not found" };
  }

  const previousStock = product.stock;

  // Atomic stock increment + movement insert via RPC
  const { error: stockError } = await ctx.supabase.rpc("inbound_stock", {
    p_product_id: result.data.product_id,
    p_quantity: result.data.quantity,
    p_notes: result.data.notes || "Manual stock entry",
  });

  if (stockError) {
    logError("register_stock_entry", stockError);
    return { success: false, error: "Error updating stock" };
  }

  logOperacion(
    "stock_entry",
    {
      product_id: result.data.product_id,
      product_name: product.name,
      quantity: result.data.quantity,
      previous_stock: previousStock,
      new_stock: previousStock + result.data.quantity,
    },
    ctx.user.id
  );

  revalidatePath("/inventory");
  return { success: true };
}

export async function listMovements(
  productId: string
): Promise<ActionResponse<InventoryMovement[]>> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const { data, error } = await ctx.supabase
    .from("inventory_movements")
    .select("*, sample_customer:customers(id, name)")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    logError("list_movements", error);
    return { success: false, error: "Error fetching movements" };
  }

  return { success: true, data: data as InventoryMovement[] };
}

export async function registerOutbound(
  _prevState: ActionResponse,
  formData: FormData
): Promise<ActionResponse> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const raw = {
    product_id: formData.get("product_id") as string,
    quantity: Number(formData.get("quantity")),
    reason: formData.get("reason") as string,
    customer_id: (formData.get("customer_id") as string) || undefined,
    notes: (formData.get("notes") as string) || undefined,
  };

  const result = registerOutboundSchema.safeParse(raw);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  // Verificar que el producto pertenece al admin (seguridad extra)
  const { data: product } = await ctx.supabase
    .from("products")
    .select("id, name, stock")
    .eq("id", result.data.product_id)
    .eq("admin_id", ctx.user.id)
    .single();

  if (!product) {
    return { success: false, error: "Producto no encontrado" };
  }

  const { error } = await ctx.supabase.rpc("register_outbound", {
    p_product_id: result.data.product_id,
    p_quantity: result.data.quantity,
    p_reason: result.data.reason,
    p_customer_id: result.data.customer_id ?? null,
    p_notes: result.data.notes ?? null,
    p_admin_id: ctx.user.id,
  });

  if (error) {
    logError("register_outbound", error, { product_id: result.data.product_id });
    return { success: false, error: error.message };
  }

  logOperacion(
    "outbound_registered",
    {
      product_id: result.data.product_id,
      product_name: product.name,
      quantity: result.data.quantity,
      reason: result.data.reason,
      customer_id: result.data.customer_id,
      previous_stock: product.stock,
    },
    ctx.user.id
  );

  revalidatePath("/inventory");
  return { success: true };
}
