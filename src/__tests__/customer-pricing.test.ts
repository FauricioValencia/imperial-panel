import { describe, it, expect } from "vitest";
import {
  PRECIO_COMPARACION_EPS,
  gananciaEstimadaPorUnidad,
  preciosDistintos,
  validarItemsContraPreciosResueltos,
} from "@/lib/customer-pricing";

describe("gananciaEstimadaPorUnidad", () => {
  it("resta el CPP al precio acordado", () => {
    expect(gananciaEstimadaPorUnidad(4000, 3000)).toBe(1000);
  });

  it("devuelve null si no hay CPP", () => {
    expect(gananciaEstimadaPorUnidad(4000, null)).toBeNull();
    expect(gananciaEstimadaPorUnidad(4000, undefined)).toBeNull();
  });
});

describe("preciosDistintos", () => {
  it("considera iguales dos valores dentro de la tolerancia", () => {
    expect(preciosDistintos(100, 100 + PRECIO_COMPARACION_EPS / 2)).toBe(false);
  });

  it("detecta diferencias fuera de tolerancia", () => {
    expect(preciosDistintos(100, 100.01)).toBe(true);
  });
});

describe("validarItemsContraPreciosResueltos", () => {
  it("acepta precios que coinciden con el mapa resuelto", () => {
    const map = new Map<string, number>([
      ["p1", 2200],
      ["p2", 5000],
    ]);
    const r = validarItemsContraPreciosResueltos(
      [
        { product_id: "p1", unit_price: 2200 },
        { product_id: "p2", unit_price: 5000 },
      ],
      map
    );
    expect(r.ok).toBe(true);
  });

  it("rechaza desajuste de precio", () => {
    const map = new Map<string, number>([["p1", 2200]]);
    const r = validarItemsContraPreciosResueltos([{ product_id: "p1", unit_price: 2500 }], map);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.desajustes).toHaveLength(1);
      expect(r.desajustes[0].enviado).toBe(2500);
      expect(r.desajustes[0].esperado).toBe(2200);
    }
  });

  it("detecta producto ausente en el mapa", () => {
    const map = new Map<string, number>();
    const r = validarItemsContraPreciosResueltos([{ product_id: "missing", unit_price: 100 }], map);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.desajustes[0].esperado).toBeNaN();
    }
  });
});
