/** Reglas puras de deudas y bloqueos del condominio (Spec-005). Sin dependencias. */

import { formatBs } from "./contabilidad";

export interface MultaBase {
  casa_id: string;
  monto: number;
  motivo: string;
  estado: "impaga" | "pagada" | "anulada";
}

export interface MesDeuda {
  mes: string; // yyyy-mm
  monto: number;
  fechaLimite: string | null; // yyyy-mm-dd; null = nunca vence (RF-7)
  pagadoEnFecha: string | null; // fecha de pago vigente, null si debe
}

export type EstadoMes =
  | "pagado"
  | "pagado_vencido"
  | "vencido"
  | "debe"
  | "sin_periodo";

/**
 * RF-10..13: estado de un mes de expensa, derivado del reloj (nunca materializado).
 * Vence solo cuando la fecha límite existe y ya pasó (comparación yyyy-mm-dd).
 * El día exacto del límite aún no vence; pagar después deja "pagado_vencido".
 */
export function estadoMes(p: {
  mes: string;
  fechaLimite: string | null;
  pagadoEnFecha: string | null;
  hoy: string;
  sinPeriodo?: boolean;
}): EstadoMes {
  if (p.sinPeriodo) return "sin_periodo";
  if (p.pagadoEnFecha) {
    return p.fechaLimite && p.pagadoEnFecha > p.fechaLimite
      ? "pagado_vencido"
      : "pagado";
  }
  if (p.fechaLimite && p.hoy > p.fechaLimite) return "vencido";
  return "debe";
}

export interface DeudaCasa {
  bloqueada: boolean;
  motivos: string[];
}

/**
 * RF-5/RF-6: deudas que bloquean la reserva del salón de una casa:
 * multas impagas (de cualquier gestión) y expensas vencidas.
 * "Debe" sin fecha límite no bloquea (RF-7) ni "pagado_vencido" (RF-12).
 */
export function deudasCasa(p: {
  casaId: string;
  multas: MultaBase[];
  meses: MesDeuda[];
  hoy: string;
}): DeudaCasa {
  const motivos: string[] = [];

  for (const m of p.multas) {
    if (m.casa_id === p.casaId && m.estado === "impaga") {
      motivos.push(`Multa impaga de ${formatBs(m.monto)} por ${m.motivo}`);
    }
  }

  for (const mes of p.meses) {
    if (
      estadoMes({
        mes: mes.mes,
        fechaLimite: mes.fechaLimite,
        pagadoEnFecha: mes.pagadoEnFecha,
        hoy: p.hoy,
      }) === "vencido"
    ) {
      motivos.push(
        `Expensa de ${mes.mes} vencida el ${mes.fechaLimite} (${formatBs(mes.monto)})`
      );
    }
  }

  return { bloqueada: motivos.length > 0, motivos };
}

/** RF-3: la multa se paga completa — el monto pagado debe alcanzar el de la multa. */
export function montoCompleto(pagado: number, multa: number): boolean {
  return pagado >= multa - 0.005;
}

/** Total de multas cobradas (solo pagadas) para el cuadre contra el libro contable. */
export function totalMultasCobradas(
  multas: { monto: number; estado: "impaga" | "pagada" | "anulada" }[]
): number {
  return (
    Math.round(
      multas.filter((m) => m.estado === "pagada").reduce((a, m) => a + m.monto, 0) * 100
    ) / 100
  );
}

/** Constitución #9: el total de multas visible cuadra con el libro contable. */
export function cuadraMultasLibro(
  totalCobrado: number,
  ingresosLibro: number
): boolean {
  return Math.abs(totalCobrado - ingresosLibro) <= 0.01;
}
