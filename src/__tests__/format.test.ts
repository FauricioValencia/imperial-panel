import { describe, it, expect } from "vitest";
import { formatCOPIntegerInput, formatNumber, parseFormattedNumber } from "@/lib/format";

describe("formatCOPIntegerInput", () => {
  it("agrupa miles al estilo es-CO", () => {
    expect(formatCOPIntegerInput("4000")).toBe(formatNumber(4000));
    expect(formatCOPIntegerInput("4250")).toBe(formatNumber(4250));
  });

  it("ignora separadores y letras al pegar", () => {
    expect(parseFormattedNumber("4.250")).toBe(4250);
    expect(formatCOPIntegerInput("4.250x")).toBe(formatNumber(4250));
  });

  it("respeta tope maximo", () => {
    const max = 50_000_000;
    expect(formatCOPIntegerInput("99999999999", max)).toBe(formatNumber(max));
  });
});
