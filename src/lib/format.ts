const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 0,
});

export function formatCurrency(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return currencyFormatter.format(0);
  return currencyFormatter.format(value);
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "";
  return numberFormatter.format(value);
}

export function parseFormattedNumber(value: string): number {
  const digits = value.replace(/\D/g, "");
  if (!digits) return 0;
  return Number(digits);
}

/**
 * Muestra miles separados por coma mientras se escribe (ej. 4,000.50).
 * Acepta punto como separador decimal (hasta 2 cifras).
 */
export function formatDecimalGroupingInput(rawInput: string): string {
  const s = rawInput.replace(/,/g, "");
  if (s === "") return "";

  const hasDot = s.includes(".");
  const [intSection, ...fracSections] = s.split(".");
  const intDigits = intSection.replace(/\D/g, "");
  const fracDigits = fracSections.join("").replace(/\D/g, "").slice(0, 2);
  const intFormatted =
    intDigits === "" ? "" : intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  if (hasDot) {
    if (fracDigits.length > 0) {
      return `${intFormatted === "" ? "0" : intFormatted}.${fracDigits}`;
    }
    return `${intFormatted === "" ? "0" : intFormatted}.`;
  }
  return intFormatted;
}

export function parseDecimalGroupingInput(value: string): number {
  const n = Number(value.replace(/,/g, ""));
  return Number.isFinite(n) ? n : Number.NaN;
}
