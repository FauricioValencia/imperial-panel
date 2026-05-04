"use server";

import { revalidatePath } from "next/cache";
import { verifyAdmin } from "@/lib/auth-helpers";
import { cargarPreciosResueltosPorProducto } from "@/lib/customer-pricing";
import {
  upsertCustomerPriceSchema,
  type ActionResponse,
  type CustomerPrice,
  type UpsertCustomerPriceInput,
} from "@/types";
import { logOperacion, logError } from "@/lib/logger";

type ProductoPrecioEmbed = NonNullable<CustomerPrice["product"]>;

function normalizarProductoEnPrecioCliente(
  product: ProductoPrecioEmbed | ProductoPrecioEmbed[] | null | undefined
): ProductoPrecioEmbed | undefined {
  if (product == null) return undefined;
  return Array.isArray(product) ? product[0] : product;
}

function filaPrecioClienteDesdeSupabase(raw: unknown): CustomerPrice {
  const r = raw as CustomerPrice & {
    product?: ProductoPrecioEmbed | ProductoPrecioEmbed[];
    custom_price: number | string;
  };
  return {
    ...r,
    custom_price: Number(r.custom_price),
    product: normalizarProductoEnPrecioCliente(r.product),
  };
}

export async function listCustomerPrices(
  customerId: string
): Promise<ActionResponse<CustomerPrice[]>> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const { data: cust, error: ce } = await ctx.supabase
    .from("customers")
    .select("id")
    .eq("id", customerId)
    .eq("admin_id", ctx.user.id)
    .single();

  if (ce || !cust) {
    return { success: false, error: "Cliente no encontrado" };
  }

  const { data, error } = await ctx.supabase
    .from("customer_prices")
    .select(
      `
      id, customer_id, product_id, admin_id, custom_price, active, notes, created_at, updated_at,
      product:products!inner(id, name, price)
    `
    )
    .eq("customer_id", customerId)
    .eq("admin_id", ctx.user.id)
    .order("active", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) {
    logError("list_customer_prices", error, { customer_id: customerId });
    return { success: false, error: "Error al cargar precios acordados" };
  }

  const rows = (data ?? []).map(filaPrecioClienteDesdeSupabase);
  return { success: true, data: rows };
}

export async function getCustomerResolvedUnitPrices(
  customerId: string,
  productIds: string[]
): Promise<ActionResponse<Record<string, number>>> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const { data: cust, error: ce } = await ctx.supabase
    .from("customers")
    .select("id")
    .eq("id", customerId)
    .eq("admin_id", ctx.user.id)
    .single();

  if (ce || !cust) {
    return { success: false, error: "Cliente no encontrado" };
  }

  try {
    const map = await cargarPreciosResueltosPorProducto(ctx.supabase, {
      adminId: ctx.user.id,
      customerId,
      productIds,
    });
    const record: Record<string, number> = {};
    map.forEach((v, k) => {
      record[k] = v;
    });
    return { success: true, data: record };
  } catch (e) {
    logError("get_customer_resolved_prices", e, { customer_id: customerId });
    return { success: false, error: "Error al resolver precios" };
  }
}

export async function upsertCustomerPrice(
  input: UpsertCustomerPriceInput
): Promise<ActionResponse<CustomerPrice>> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const parsed = upsertCustomerPriceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { customer_id, product_id, custom_price, notes } = parsed.data;

  const { data: product, error: pe } = await ctx.supabase
    .from("products")
    .select("id, active")
    .eq("id", product_id)
    .eq("admin_id", ctx.user.id)
    .single();

  if (pe || !product) {
    return { success: false, error: "Producto no encontrado" };
  }
  if (!product.active) {
    return { success: false, error: "No se puede acordar precio en producto inactivo" };
  }

  const { data: customer, error: cte } = await ctx.supabase
    .from("customers")
    .select("id, active")
    .eq("id", customer_id)
    .eq("admin_id", ctx.user.id)
    .single();

  if (cte || !customer) {
    return { success: false, error: "Cliente no encontrado" };
  }
  if (!customer.active) {
    return { success: false, error: "Cliente inactivo" };
  }

  const { data, error } = await ctx.supabase
    .from("customer_prices")
    .upsert(
      {
        customer_id,
        product_id,
        custom_price,
        notes: notes ?? null,
        active: true,
        admin_id: ctx.user.id,
      },
      { onConflict: "admin_id,customer_id,product_id" }
    )
    .select(
      `
      id, customer_id, product_id, admin_id, custom_price, active, notes, created_at, updated_at,
      product:products!inner(id, name, price)
    `
    )
    .single();

  if (error || !data) {
    logError("upsert_customer_price", error, { customer_id, product_id });
    return { success: false, error: "Error al guardar precio acordado" };
  }

  logOperacion(
    "customer_price_upserted",
    { customer_id, product_id, custom_price },
    ctx.user.id
  );
  revalidatePath("/customers");
  revalidatePath(`/customers/${customer_id}`);
  return { success: true, data: filaPrecioClienteDesdeSupabase(data) };
}

export async function deactivateCustomerPrice(priceId: string): Promise<ActionResponse> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const { data: row, error: fe } = await ctx.supabase
    .from("customer_prices")
    .select("id, customer_id")
    .eq("id", priceId)
    .eq("admin_id", ctx.user.id)
    .single();

  if (fe || !row) {
    return { success: false, error: "Registro no encontrado" };
  }

  const { error } = await ctx.supabase
    .from("customer_prices")
    .update({ active: false })
    .eq("id", priceId)
    .eq("admin_id", ctx.user.id);

  if (error) {
    logError("deactivate_customer_price", error, { price_id: priceId });
    return { success: false, error: "Error al desactivar precio" };
  }

  logOperacion("customer_price_deactivated", { price_id: priceId, customer_id: row.customer_id }, ctx.user.id);
  revalidatePath("/customers");
  revalidatePath(`/customers/${row.customer_id}`);
  return { success: true };
}
