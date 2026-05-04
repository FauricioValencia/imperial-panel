import type { SupabaseClient } from "@supabase/supabase-js";

/** Tolerancia en pesos para comparar precios numeric(12,2). */
export const PRECIO_COMPARACION_EPS = 0.005;

export function preciosDistintos(a: number, b: number): boolean {
  return Math.abs(a - b) >= PRECIO_COMPARACION_EPS;
}

export interface ItemPrecioEnviado {
  product_id: string;
  unit_price: number;
}

/**
 * Carga precio de venta esperado por producto: acuerdo activo o precio de lista.
 */
export async function cargarPreciosResueltosPorProducto(
  supabase: SupabaseClient,
  params: { adminId: string; customerId: string; productIds: string[] }
): Promise<Map<string, number>> {
  const { adminId, customerId, productIds } = params;
  const map = new Map<string, number>();
  const uniqueIds = Array.from(new Set(productIds)).filter(Boolean);
  if (uniqueIds.length === 0) return map;

  const [{ data: productRows, error: prodErr }, { data: agreementRows, error: agrErr }] =
    await Promise.all([
      supabase
        .from("products")
        .select("id, price")
        .eq("admin_id", adminId)
        .in("id", uniqueIds),
      supabase
        .from("customer_prices")
        .select("product_id, custom_price")
        .eq("admin_id", adminId)
        .eq("customer_id", customerId)
        .eq("active", true)
        .in("product_id", uniqueIds),
    ]);

  if (prodErr || agrErr) {
    throw new Error(prodErr?.message ?? agrErr?.message ?? "Error cargando precios");
  }

  const catalog = new Map(
    (productRows as { id: string; price: number }[] | null)?.map((p) => [p.id, Number(p.price)]) ?? []
  );
  const agreements = new Map(
    (agreementRows as { product_id: string; custom_price: number }[] | null)?.map((r) => [
      r.product_id,
      Number(r.custom_price),
    ]) ?? []
  );

  for (const pid of uniqueIds) {
    const agreed = agreements.get(pid);
    if (agreed !== undefined) {
      map.set(pid, agreed);
    } else {
      const list = catalog.get(pid);
      if (list !== undefined) map.set(pid, list);
    }
  }

  return map;
}

export function validarItemsContraPreciosResueltos(
  items: ItemPrecioEnviado[],
  resueltoPorProducto: Map<string, number>
): { ok: true } | { ok: false; desajustes: { product_id: string; enviado: number; esperado: number }[] } {
  const desajustes: { product_id: string; enviado: number; esperado: number }[] = [];
  for (const item of items) {
    const esperado = resueltoPorProducto.get(item.product_id);
    if (esperado === undefined) {
      desajustes.push({
        product_id: item.product_id,
        enviado: item.unit_price,
        esperado: Number.NaN,
      });
      continue;
    }
    if (preciosDistintos(item.unit_price, esperado)) {
      desajustes.push({ product_id: item.product_id, enviado: item.unit_price, esperado });
    }
  }
  if (desajustes.length > 0) return { ok: false, desajustes };
  return { ok: true };
}
