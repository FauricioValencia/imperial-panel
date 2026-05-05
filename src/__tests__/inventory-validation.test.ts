import { describe, it, expect } from "vitest";
import {
  aggregateRequiredByProduct,
  computeStockShortages,
  formatShortageError,
  type InventoryGlobalRow,
} from "@/lib/inventory-validation";

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
