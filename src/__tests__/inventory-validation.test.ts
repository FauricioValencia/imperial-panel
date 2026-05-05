import { describe, it, expect } from "vitest";
import {
  aggregateRequiredByProduct,
  computeStockShortages,
  formatShortageError,
  getDeliveryBreakdown,
  type InventoryGlobalRow,
} from "@/lib/inventory-validation";
import { confirmDeliverySchema } from "@/types";

describe("aggregateRequiredByProduct", () => {
  it("suma cantidades de items duplicados del mismo producto", () => {
    const result = aggregateRequiredByProduct([
      { product_id: "p1", quantity: 3 },
      { product_id: "p2", quantity: 5 },
      { product_id: "p1", quantity: 2 },
    ]);
    expect(result.get("p1")).toBe(5);
    expect(result.get("p2")).toBe(5);
    expect(result.size).toBe(2);
  });

  it("devuelve mapa vacio si no hay items", () => {
    expect(aggregateRequiredByProduct([]).size).toBe(0);
  });
});

describe("computeStockShortages", () => {
  const rows: InventoryGlobalRow[] = [
    { product_id: "p1", name: "Mango", available_global: 87 },
    { product_id: "p2", name: "Uva", available_global: 5 },
  ];

  it("no reporta faltantes cuando stock global cubre lo requerido", () => {
    const required = new Map([["p1", 8], ["p2", 3]]);
    expect(computeStockShortages(required, rows)).toEqual([]);
  });

  it("reporta el faltante exacto por producto", () => {
    const required = new Map([["p1", 90], ["p2", 10]]);
    const shortages = computeStockShortages(required, rows);
    expect(shortages).toHaveLength(2);
    expect(shortages[0]).toEqual({
      product_id: "p1",
      product_name: "Mango",
      required: 90,
      available: 87,
      shortfall: 3,
    });
    expect(shortages[1]).toEqual({
      product_id: "p2",
      product_name: "Uva",
      required: 10,
      available: 5,
      shortfall: 5,
    });
  });

  it("considera disponible=0 cuando el producto no aparece en stockRows", () => {
    const required = new Map([["p3", 4]]);
    const shortages = computeStockShortages(required, rows);
    expect(shortages).toHaveLength(1);
    expect(shortages[0]).toMatchObject({
      product_id: "p3",
      available: 0,
      required: 4,
      shortfall: 4,
      product_name: "Producto",
    });
  });

  it("convierte available_global string-numerico a number", () => {
    const stringRows = [
      { product_id: "p1", name: "Mango", available_global: "10" as unknown as number },
    ];
    const required = new Map([["p1", 5]]);
    expect(computeStockShortages(required, stringRows)).toEqual([]);
  });

  it("reproduce el caso del bug: 87 disponible cubre 8 requeridos", () => {
    const required = new Map([["mango", 8]]);
    const stock: InventoryGlobalRow[] = [
      { product_id: "mango", name: "IMPERIAL MANGO", available_global: 87 },
    ];
    expect(computeStockShortages(required, stock)).toEqual([]);
  });
});

describe("formatShortageError", () => {
  it("devuelve string vacio si no hay faltantes", () => {
    expect(formatShortageError([])).toBe("");
  });

  it("formatea un solo faltante sin sufijo", () => {
    const msg = formatShortageError([
      {
        product_id: "p1",
        product_name: "Mango",
        required: 10,
        available: 3,
        shortfall: 7,
      },
    ]);
    expect(msg).toBe(
      "Stock global insuficiente para Mango: 3 disponible (central + couriers), faltan 7."
    );
  });

  it("agrega el sufijo (y N mas) cuando hay multiples faltantes", () => {
    const msg = formatShortageError([
      { product_id: "p1", product_name: "Mango", required: 10, available: 3, shortfall: 7 },
      { product_id: "p2", product_name: "Uva", required: 4, available: 1, shortfall: 3 },
      { product_id: "p3", product_name: "Lulo", required: 2, available: 0, shortfall: 2 },
    ]);
    expect(msg).toContain("Mango");
    expect(msg).toContain("(y 2 mas)");
  });
});

describe("getDeliveryBreakdown", () => {
  it("entrega completa sin returns ni swaps", () => {
    const r = getDeliveryBreakdown(5, 0, 0);
    expect(r).toEqual({ deliveredQty: 5, originalDelivered: 5 });
  });

  it("devolucion parcial sin swap", () => {
    const r = getDeliveryBreakdown(5, 2, 0);
    expect(r).toEqual({ deliveredQty: 3, originalDelivered: 3 });
  });

  it("swap reduce el original entregado pero no el delivered total", () => {
    // 5 pedidos, 0 devueltos, 2 swapped -> 3 originales + 2 cambios = 5 total
    const r = getDeliveryBreakdown(5, 0, 2);
    expect(r).toEqual({ deliveredQty: 5, originalDelivered: 3 });
  });

  it("combinacion de return + swap", () => {
    // 5 pedidos, 1 devuelto, 2 swapped -> 1 original + 2 cambios = 3 entregados, 1 devuelto
    const r = getDeliveryBreakdown(5, 1, 2);
    expect(r).toEqual({ deliveredQty: 4, originalDelivered: 2 });
  });

  it("originalDelivered no puede ser negativo aunque swap exceda", () => {
    const r = getDeliveryBreakdown(5, 0, 10);
    expect(r.originalDelivered).toBe(0);
  });
});

describe("confirmDeliverySchema (swaps)", () => {
  // Zod v4 valida formato UUID con version >= 1; usar UUIDs v4 reales.
  const baseOrderId = "11111111-1111-4111-8111-111111111111";
  const itemId = "22222222-2222-4222-8222-222222222222";
  const productId = "33333333-3333-4333-8333-333333333333";

  it("acepta payload sin swaps ni returns", () => {
    const r = confirmDeliverySchema.safeParse({ order_id: baseOrderId });
    expect(r.success).toBe(true);
  });

  it("acepta swap valido", () => {
    const r = confirmDeliverySchema.safeParse({
      order_id: baseOrderId,
      swaps: [
        {
          order_item_id: itemId,
          swapped_product_id: productId,
          swapped_quantity: 2,
          source: "courier_kit",
        },
      ],
    });
    expect(r.success).toBe(true);
  });

  it("rechaza source invalido", () => {
    const r = confirmDeliverySchema.safeParse({
      order_id: baseOrderId,
      swaps: [
        {
          order_item_id: itemId,
          swapped_product_id: productId,
          swapped_quantity: 2,
          source: "warehouse",
        },
      ],
    });
    expect(r.success).toBe(false);
  });

  it("rechaza swapped_quantity 0 o negativo", () => {
    const r = confirmDeliverySchema.safeParse({
      order_id: baseOrderId,
      swaps: [
        {
          order_item_id: itemId,
          swapped_product_id: productId,
          swapped_quantity: 0,
          source: "courier_kit",
        },
      ],
    });
    expect(r.success).toBe(false);
  });

  it("acepta source central", () => {
    const r = confirmDeliverySchema.safeParse({
      order_id: baseOrderId,
      swaps: [
        {
          order_item_id: itemId,
          swapped_product_id: productId,
          swapped_quantity: 1,
          source: "central",
        },
      ],
    });
    expect(r.success).toBe(true);
  });
});
