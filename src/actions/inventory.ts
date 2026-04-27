"use server";

import { revalidatePath } from "next/cache";
import { verifyAdmin } from "@/lib/auth-helpers";
import {
  productSchema,
  registerOutboundSchema,
  stockEntryWithLotSchema,
  type ActionResponse,
  type Product,
  type ProductLot,
  type InventoryMovement,
} from "@/types";
import { logOperacion, logError } from "@/lib/logger";

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

  const stockValue = Number(formData.get("stock"));
  const noExpiration = formData.get("initial_no_expiration") === "on";
  const expiresAtRaw = formData.get("initial_expires_at") as string | null;
  const supplierRaw = formData.get("initial_supplier") as string | null;
  const initialUnitCostRaw = formData.get("initial_unit_cost");

  const raw = {
    name: formData.get("name"),
    codigo: (formData.get("codigo") as string) || undefined,
    description: formData.get("description") || undefined,
    price: Number(formData.get("price")),
    stock: stockValue,
    min_stock: Number(formData.get("min_stock")) || 5,
    initial_unit_cost:
      initialUnitCostRaw !== null && initialUnitCostRaw !== ""
        ? Number(initialUnitCostRaw)
        : undefined,
    initial_expires_at: expiresAtRaw || undefined,
    initial_no_expiration: noExpiration,
    initial_supplier: supplierRaw || undefined,
  };

  const result = productSchema.safeParse(raw);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  if (result.data.stock > 0 && result.data.initial_unit_cost === undefined) {
    return {
      success: false,
      error: "Indica el costo unitario del lote inicial cuando hay stock inicial",
    };
  }
  if (result.data.stock > 0 && !result.data.initial_no_expiration && !result.data.initial_expires_at) {
    return {
      success: false,
      error: "Indica fecha de vencimiento o marca producto no perecedero",
    };
  }

  const dataToInsert = {
    name: result.data.name,
    codigo: result.data.codigo?.toUpperCase() ?? null,
    description: result.data.description ?? null,
    price: result.data.price,
    stock: 0,
    min_stock: result.data.min_stock,
    admin_id: ctx.user.id,
  };

  const { data: product, error } = await ctx.supabase
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
    const { data: lotId, error: lotError } = await ctx.supabase.rpc("inbound_stock_with_lot", {
      p_product_id: product.id,
      p_quantity: result.data.stock,
      p_unit_cost: result.data.initial_unit_cost!,
      p_admin_id: ctx.user.id,
      p_expires_at: result.data.initial_no_expiration
        ? null
        : result.data.initial_expires_at ?? null,
      p_no_expiration: result.data.initial_no_expiration ?? false,
      p_supplier: result.data.initial_supplier ?? null,
      p_notes: "Lote inicial al crear producto",
    });

    if (lotError) {
      logError("create_product_initial_lot", lotError, { product_id: product.id });
      return {
        success: false,
        error: `Producto creado pero falló el lote inicial: ${lotError.message}`,
      };
    }

    logOperacion(
      "product_created_with_lot",
      { product_id: product.id, name: product.name, lot_id: lotId, quantity: result.data.stock },
      ctx.user.id
    );
  } else {
    logOperacion("product_created", { product_id: product.id, name: product.name }, ctx.user.id);
  }

  revalidatePath("/inventory");
  return { success: true, data: product };
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

  // Solo datos basicos: stock se mueve por lotes (RPCs)
  const dataToUpdate = {
    name: result.data.name,
    codigo: result.data.codigo?.toUpperCase() ?? null,
    description: result.data.description ?? null,
    price: result.data.price,
    min_stock: result.data.min_stock,
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

  const noExpiration = formData.get("no_expiration") === "on";
  const expiresAtRaw = formData.get("expires_at") as string | null;

  const raw = {
    product_id: formData.get("product_id") as string,
    quantity: Number(formData.get("quantity")),
    unit_cost: Number(formData.get("unit_cost")),
    lot_number: (formData.get("lot_number") as string) || undefined,
    expires_at: expiresAtRaw || undefined,
    no_expiration: noExpiration,
    supplier: (formData.get("supplier") as string) || undefined,
    notes: (formData.get("notes") as string) || undefined,
  };

  const result = stockEntryWithLotSchema.safeParse(raw);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  const { data: product } = await ctx.supabase
    .from("products")
    .select("id, name, stock, admin_id")
    .eq("id", result.data.product_id)
    .eq("admin_id", ctx.user.id)
    .single();

  if (!product) {
    return { success: false, error: "Producto no encontrado" };
  }

  const { data: lotId, error: rpcError } = await ctx.supabase.rpc("inbound_stock_with_lot", {
    p_product_id: result.data.product_id,
    p_quantity: result.data.quantity,
    p_unit_cost: result.data.unit_cost,
    p_admin_id: ctx.user.id,
    p_lot_number: result.data.lot_number ?? null,
    p_expires_at: result.data.no_expiration ? null : result.data.expires_at ?? null,
    p_no_expiration: result.data.no_expiration ?? false,
    p_supplier: result.data.supplier ?? null,
    p_notes: result.data.notes ?? null,
  });

  if (rpcError) {
    logError("register_stock_entry", rpcError);
    return { success: false, error: `Error al crear lote: ${rpcError.message}` };
  }

  logOperacion(
    "stock_entry_with_lot",
    {
      product_id: result.data.product_id,
      product_name: product.name,
      lot_id: lotId,
      quantity: result.data.quantity,
      unit_cost: result.data.unit_cost,
    },
    ctx.user.id
  );

  void lotId;
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
    .select("*, sample_customer:customers(id, name), lot:product_lots(id, lot_number)")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    logError("list_movements", error);
    return { success: false, error: "Error fetching movements" };
  }

  return { success: true, data: data as InventoryMovement[] };
}

export async function listLots(productId?: string): Promise<ActionResponse<ProductLot[]>> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  let query = ctx.supabase
    .from("product_lots")
    .select("*, product:products(id, name, codigo, price)")
    .eq("admin_id", ctx.user.id)
    .order("received_at", { ascending: true });

  if (productId) {
    query = query.eq("product_id", productId);
  }

  const { data, error } = await query;

  if (error) {
    logError("list_lots", error);
    return { success: false, error: "Error fetching lots" };
  }

  return { success: true, data: data as ProductLot[] };
}

export async function listExpiringLots(daysAhead = 30): Promise<ActionResponse<ProductLot[]>> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + daysAhead);

  const { data, error } = await ctx.supabase
    .from("product_lots")
    .select("*, product:products(id, name, codigo)")
    .eq("admin_id", ctx.user.id)
    .eq("active", true)
    .gt("quantity_remaining", 0)
    .not("expires_at", "is", null)
    .lte("expires_at", cutoff.toISOString())
    .order("expires_at", { ascending: true });

  if (error) {
    logError("list_expiring_lots", error);
    return { success: false, error: "Error fetching expiring lots" };
  }

  return { success: true, data: data as ProductLot[] };
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

  const { data: product } = await ctx.supabase
    .from("products")
    .select("id, name, stock, stock_available")
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
