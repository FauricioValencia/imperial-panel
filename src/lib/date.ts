// Helpers de fechas alineadas a Colombia (America/Bogota = UTC-05:00, sin DST).
//
// Problema que resuelve: <input type="date"> entrega "YYYY-MM-DD". Si lo
// pasamos a `new Date(...)` o lo enviamos como TIMESTAMPTZ, el navegador
// lo parsea como UTC midnight, que en hora Bogota es 19:00 del dia previo.
// Un lote "vence 2026-05-04" terminaria muriendo a las 19:00 del 03-05.
//
// Convencion: cuando un usuario selecciona un dia calendario, asumimos que
// se refiere al fin de ese dia en Bogota (23:59:59-05:00).

const BOGOTA_OFFSET = "-05:00";

// "YYYY-MM-DD" -> "YYYY-MM-DDT23:59:59-05:00".
// Retorna null si la entrada es vacia o invalida.
export function bogotaEndOfDayISO(yyyyMmDd: string | null | undefined): string | null {
  if (!yyyyMmDd) return null;
  const trimmed = yyyyMmDd.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  return `${trimmed}T23:59:59${BOGOTA_OFFSET}`;
}

// Devuelve el dia calendario actual en Bogota como "YYYY-MM-DD".
export function bogotaTodayYmd(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${d}`;
}

// "YYYY-MM-DD" + N dias -> "YYYY-MM-DD" en Bogota.
export function bogotaAddDaysYmd(yyyyMmDd: string, days: number): string {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  // Construimos un Date en UTC al mediodia para evitar saltos por DST/offset
  // al sumar dias (Bogota no tiene DST pero el calculo se hace en UTC).
  const utc = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  utc.setUTCDate(utc.getUTCDate() + days);
  const yy = utc.getUTCFullYear();
  const mm = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(utc.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}
