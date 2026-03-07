"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  productSchema,
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

async function verifyAdmin() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: userData } = await supabase
    .from("users")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (!userData || userData.role !== "admin") return null;

  return { supabase, user: userData };
}

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
    description: formData.get("description") || undefined,
    price: Number(formData.get("price")),
    stock: Number(formData.get("stock")),
    min_stock: Number(formData.get("min_stock")) || 5,
  };

  const result = productSchema.safeParse(raw);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  const { data, error } = await ctx.supabase
    .from("products")
    .insert(result.data)
    .select()
    .single();

  if (error) {
    logError("create_product", error);
    return { success: false, error: "Error creating product" };
  }

  if (result.data.stock > 0) {
    await ctx.supabase.from("inventory_movements").insert({
      product_id: data.id,
      type: "inbound",
      quantity: result.data.stock,
      notes: "Initial stock on product creation",
    });
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
  const { stock: _stock, ...dataToUpdate } = result.data;

  const { error } = await ctx.supabase
    .from("products")
    .update(dataToUpdate)
    .eq("id", productId);

  if (error) {
    logError("update_product", error, { product_id: productId });
    return { success: false, error: "Error updating product" };
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

  const { data: product } = await ctx.supabase
    .from("products")
    .select("stock, name")
    .eq("id", result.data.product_id)
    .single();

  if (!product) {
    return { success: false, error: "Product not found" };
  }

  const newStock = product.stock + result.data.quantity;

  const { error: updateError } = await ctx.supabase
    .from("products")
    .update({ stock: newStock })
    .eq("id", result.data.product_id);

  if (updateError) {
    logError("register_stock_entry", updateError);
    return { success: false, error: "Error updating stock" };
  }

  const { error: movError } = await ctx.supabase
    .from("inventory_movements")
    .insert({
      product_id: result.data.product_id,
      type: "inbound",
      quantity: result.data.quantity,
      notes: result.data.notes || "Manual stock entry",
    });

  if (movError) {
    logError("register_movement_entry", movError);
  }

  logOperacion(
    "stock_entry",
    {
      product_id: result.data.product_id,
      product_name: product.name,
      quantity: result.data.quantity,
      previous_stock: product.stock,
      new_stock: newStock,
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
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    logError("list_movements", error);
    return { success: false, error: "Error fetching movements" };
  }

  return { success: true, data: data as InventoryMovement[] };
}
