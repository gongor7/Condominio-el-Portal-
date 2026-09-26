/** Reglas puras del módulo del salón de eventos (Spec-003). Sin dependencias. */

export interface ReservaBase {
  id: string;
  fecha: string; // yyyy-mm-dd
  monto: number;
  estado: "vigente" | "anulada";
  vecino_nombre: string;
}

/**
 * RF-3: valida que la cadena sea una fecha de calendario real en formato yyyy-mm-dd.
 * Date.parse acepta "2026-02-30" desbordando al 2 de marzo; por eso se re-serializa y compara.
 */
export function esFechaValida(fecha: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const d = new Date(`${fecha}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return false;
  return d.toISOString().slice(0, 10) === fecha;
}

/**
 * RF-4: una fecha está disponible si es válida, no está reservada (vigente)
 * y no es anterior a hoy (hoy mismo sí se puede reservar).
 */
export function fechaDisponible(
  fecha: string,
  fechasOcupadas: string[],
  hoy: string
): boolean {
  if (!esFechaValida(fecha)) return false;
  if (!esFechaValida(hoy)) return false;
  if (fechasOcupadas.includes(fecha)) return false;
  return fecha >= hoy;
}

/** RF-7: total recaudado del salón; excluye anuladas y gratuitas (monto 0). */
export function totalSalon(reservas: ReservaBase[]): number {
  return (
    Math.round(
      reservas
        .filter((r) => r.estado === "vigente" && r.monto > 0)
        .reduce((a, r) => a + r.monto, 0) * 100
    ) / 100
  );
}

/** RF-7 / constitución #9: el total del salón debe cuadrar con el libro contable. */
export function cuadraConLibro(totalSalon: number, ingresosLibro: number): boolean {
  return Math.abs(totalSalon - ingresosLibro) <= 0.01;
}

export interface MesReservas {
  vigentes: ReservaBase[];
  anuladas: ReservaBase[];
  totalMes: number;
}

/** RF-11: agrupa reservas por mes (yyyy-mm) separando vigentes de anuladas. */
export function agruparPorMes(reservas: ReservaBase[]): Record<string, MesReservas> {
  return reservas.reduce<Record<string, MesReservas>>((acc, r) => {
    const mes = r.fecha.slice(0, 7);
    if (!acc[mes]) acc[mes] = { vigentes: [], anuladas: [], totalMes: 0 };
    if (r.estado === "anulada") acc[mes].anuladas.push(r);
    else {
      acc[mes].vigentes.push(r);
      acc[mes].totalMes += r.monto;
    }
    return acc;
  }, {});
}

/** Mes actual (yyyy-mm) en la zona horaria de Bolivia (America/La_Paz, UTC-4). */
export function mesActualAmericaLaPaz(ahora: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/La_Paz",
    year: "numeric",
    month: "2-digit",
  });
  const { year, month } = Object.fromEntries(
    fmt.formatToParts(ahora).map((p) => [p.type, p.value])
  );
  return `${year}-${month}`;
}

/** Fecha de hoy (yyyy-mm-dd) en America/La_Paz. */
export function hoyAmericaLaPaz(ahora: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/La_Paz",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const { year, month, day } = Object.fromEntries(
    fmt.formatToParts(ahora).map((p) => [p.type, p.value])
  );
  return `${year}-${month}-${day}`;
}
