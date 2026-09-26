/** Reglas puras del módulo de expensas (Spec-004). Sin dependencias. */

export interface PeriodoExpensa {
  mes: string; // yyyy-mm
  monto: number;
}

/**
 * RF-7: meses que una casa puede pagar ahora:
 * definidos (con período), no pagados aún, y nunca futuros
 * (solo el mes actual y meses atrasados).
 */
export function mesesPagables(
  mesActual: string,
  periodos: PeriodoExpensa[],
  mesesYaPagados: string[]
): string[] {
  return periodos
    .map((p) => p.mes)
    .filter((mes) => mes <= mesActual)
    .filter((mes) => !mesesYaPagados.includes(mes))
    .sort();
}

/**
 * RF-9: total esperado = SUMA del monto de cada mes elegido
 * (los meses pueden tener montos distintos). Null si algún mes no tiene período.
 */
export function totalEsperado(
  mesesElegidos: string[],
  periodos: PeriodoExpensa[]
): number | null {
  if (mesesElegidos.length === 0) return 0;
  let total = 0;
  for (const mes of mesesElegidos) {
    const p = periodos.find((x) => x.mes === mes);
    if (!p) return null;
    total += p.monto;
  }
  return Math.round(total * 100) / 100;
}

export interface PagoMesBase {
  casa_id: string;
  mes: string;
  monto_mes: number;
  vigente: boolean;
}

export interface CeldaGrilla {
  estado: "pagado" | "debe";
  monto: number; // monto con el que se pagó (o el esperado si debe)
}

/** RF-12: estado de cada celda casas × meses. Solo columnas con período definido. */
export function estadosGrilla(
  casas: string[],
  periodos: PeriodoExpensa[],
  pagosMes: PagoMesBase[]
): Record<string, Record<string, CeldaGrilla>> {
  const grilla: Record<string, Record<string, CeldaGrilla>> = {};
  const pagados = new Map<string, PagoMesBase>();
  for (const p of pagosMes) {
    if (p.vigente) pagados.set(`${p.casa_id}|${p.mes}`, p);
  }
  for (const casa of casas) {
    grilla[casa] = {};
    for (const { mes, monto } of periodos) {
      const pagado = pagados.get(`${casa}|${mes}`);
      grilla[casa][mes] = pagado
        ? { estado: "pagado", monto: pagado.monto_mes }
        : { estado: "debe", monto };
    }
  }
  return grilla;
}

/** Total recaudado en expensas (solo pagos vigentes). */
export function totalExpensas(
  pagos: { monto_total: number; vigente: boolean }[]
): number {
  return (
    Math.round(
      pagos.filter((p) => p.vigente).reduce((a, p) => a + p.monto_total, 0) * 100
    ) / 100
  );
}

/**
 * RF-10/RF-11: reparte el monto pagado entre los meses elegidos.
 * Cada mes (excepto el último) recibe exactamente su monto de período;
 * el último mes absorbe el ajuste (sobrante o faltante) para que la
 * suma cuadre exacto con el comprobante.
 */
export function repartoMontos(
  montoPagado: number,
  mesesElegidos: string[],
  periodos: PeriodoExpensa[]
): { mes: string; monto_mes: number }[] {
  if (mesesElegidos.length === 0) return [];
  const previos = mesesElegidos.slice(0, -1).map((mes) => ({
    mes,
    monto_mes: periodos.find((p) => p.mes === mes)?.monto ?? 0,
  }));
  const sumaPrevios = previos.reduce((a, r) => a + r.monto_mes, 0);
  const ultimoMes = mesesElegidos[mesesElegidos.length - 1];
  return [
    ...previos,
    {
      mes: ultimoMes,
      monto_mes: Math.round((montoPagado - sumaPrevios) * 100) / 100,
    },
  ];
}
