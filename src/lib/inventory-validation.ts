import type { CourierStockShortage } from "@/types";

export interface InventoryGlobalRow {
  product_id: string;
  name: string;
  available_global: number;
}

/**
 * Agrega cantidades por producto sumando duplicados de items de un pedido.
 * Soporta items con el mismo product_id que aparecen mas de una vez.
 */
export function aggregateRequiredByProduct<T extends { product_id: string; quantity: number }>(
  items: readonly T[]
): Map<string, number> {
  const result = new Map<string, number>();
  for (const item of items) {
    result.set(item.product_id, (result.get(item.product_id) ?? 0) + item.quantity);
  }
  return result;
}

/**
 * Calcula faltantes comparando required vs disponible global.
 * Si un producto no aparece en stockRows se considera disponible = 0.
 * Se usa al asignar un pedido y al crearlo: ambos validan contra la misma fuente.
 */
export function computeStockShortages(
  requiredByProduct: ReadonlyMap<string, number>,
  stockRows: readonly InventoryGlobalRow[]
): CourierStockShortage[] {
  const stockMap = new Map(
    stockRows.map((p) => [p.product_id, { name: p.name, available: Number(p.available_global) }])
  );
  const shortages: CourierStockShortage[] = [];
  for (const [productId, requiredQty] of requiredByProduct) {
    const product = stockMap.get(productId);
    const available = product?.available ?? 0;
    if (available < requiredQty) {
      shortages.push({
        product_id: productId,
        product_name: product?.name ?? "Producto",
        required: requiredQty,
        available,
        shortfall: requiredQty - available,
      });
    }
  }
  return shortages;
}

export function formatShortageError(shortages: readonly CourierStockShortage[]): string {
  if (shortages.length === 0) return "";
  const first = shortages[0];
  const extra = shortages.length > 1 ? ` (y ${shortages.length - 1} mas)` : "";
  return `Stock global insuficiente para ${first.product_name}: ${first.available} disponible (central + couriers), faltan ${first.shortfall}${extra}.`;
}
