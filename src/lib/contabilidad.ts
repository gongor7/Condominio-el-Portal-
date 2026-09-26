/** Reglas contables puras del condominio (sin dependencias, testeables). */

export interface TransaccionBase {
  tipo: "ingreso" | "egreso";
  monto: number;
  anulado?: boolean;
}

export interface CampanaBase {
  meta: number | null;
  aportes: number[]; // montos
  gastos: number[]; // montos
  estado: "activa" | "cerrada";
}

export function saldoGestion(
  transacciones: TransaccionBase[],
  saldoInicial = 0
): number {
  return (
    saldoInicial +
    transacciones
      .filter((t) => !t.anulado)
      .reduce(
        (acc, t) => acc + (t.tipo === "ingreso" ? t.monto : -t.monto),
        0
      )
  );
}

export function totalesGestion(transacciones: TransaccionBase[]) {
  const vigentes = transacciones.filter((t) => !t.anulado);
  return {
    ingresos: vigentes
      .filter((t) => t.tipo === "ingreso")
      .reduce((a, t) => a + t.monto, 0),
    egresos: vigentes
      .filter((t) => t.tipo === "egreso")
      .reduce((a, t) => a + t.monto, 0),
  };
}

export interface ResumenCampana {
  recaudado: number;
  gastado: number;
  saldo: number; // > 0 sobra, < 0 falta
  meta: number | null;
  faltante: number | null; // cuánto falta para la meta (null si sin meta o ya cumplida)
  estadoSugerido: "sobra" | "falta" | "exacto";
}

export function resumenCampana(campana: CampanaBase): ResumenCampana {
  const recaudado = campana.aportes.reduce((a, m) => a + m, 0);
  const gastado = campana.gastos.reduce((a, m) => a + m, 0);
  const saldo = Math.round((recaudado - gastado) * 100) / 100;
  const meta = campana.meta;
  const faltante =
    meta === null ? null : Math.max(0, Math.round((meta - recaudado) * 100) / 100);
  const estadoSugerido =
    saldo > 0.004 ? "sobra" : saldo < -0.004 ? "falta" : "exacto";
  return { recaudado, gastado, saldo, meta, faltante, estadoSugerido };
}

/** Formato de moneda boliviano: 1.234,56 Bs */
export function formatBs(monto: number): string {
  const s = Math.abs(monto).toLocaleString("es-BO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${monto < 0 ? "−" : ""}${s} Bs`;
}

export function validarTransaccion(t: {
  tipo: string;
  monto: number;
  fecha: string;
}): string | null {
  if (t.tipo !== "ingreso" && t.tipo !== "egreso")
    return "El tipo debe ser ingreso o egreso";
  if (!(t.monto > 0)) return "El monto debe ser mayor a cero";
  if (Number.isNaN(Date.parse(t.fecha))) return "Fecha inválida";
  return null;
}

export interface EstadoCierre {
  campanasActivas: number;
  saldoPendiente: number;
}

export interface ResultadoCierre {
  puedeCerrar: boolean;
  bloqueos: string[];
  avisos: string[];
}

/**
 * RF-10: solo se puede cerrar una gestión sin campañas activas.
 * El saldo pendiente no bloquea: queda registrado como aviso para la siguiente gestión.
 */
export function puedeCerrarGestion(estado: EstadoCierre): ResultadoCierre {
  const bloqueos: string[] = [];
  const avisos: string[] = [];
  if (estado.campanasActivas > 0) {
    bloqueos.push(
      `Tiene ${estado.campanasActivas} campaña${estado.campanasActivas === 1 ? "" : "s"} activa${estado.campanasActivas === 1 ? "" : "s"}; ciérrala${estado.campanasActivas === 1 ? "" : "s"} primero.`
    );
  }
  if (estado.saldoPendiente !== 0) {
    avisos.push(
      `Queda un saldo de ${formatBs(estado.saldoPendiente)} que se transferirá a la siguiente gestión.`
    );
  }
  return { puedeCerrar: bloqueos.length === 0, bloqueos, avisos };
}

export interface GestionEstado {
  cerrada: boolean;
}

/** RF-10: una gestión cerrada es inmutable; ninguna escritura se acepta sobre ella. */
export function puedeEscribirEnGestion(
  gestion: GestionEstado | null
): { permitido: boolean; motivo: string | null } {
  if (!gestion) {
    return { permitido: false, motivo: "No hay gestión activa." };
  }
  if (gestion.cerrada) {
    return {
      permitido: false,
      motivo: "La gestión está cerrada e inmutable; no se pueden registrar movimientos.",
    };
  }
  return { permitido: true, motivo: null };
}

/** RF-8: al cerrarse una campaña (o su gestión) los aportes quedan congelados. */
export function puedeAportar(campana: {
  estado: "activa" | "cerrada";
  gestionCerrada: boolean;
}): { permitido: boolean; motivo: string | null } {
  if (campana.estado === "cerrada") {
    return { permitido: false, motivo: "La campaña ya está cerrada." };
  }
  if (campana.gestionCerrada) {
    return {
      permitido: false,
      motivo: "La gestión está cerrada e inmutable; los aportes quedan congelados.",
    };
  }
  return { permitido: true, motivo: null };
}
