/**
 * Generador del reporte Excel de toda la base (Spec-010).
 * Función pura: recibe los datos ya consultados y devuelve el workbook en Buffer,
 * así se puede testear sin base de datos.
 */
import ExcelJS from "exceljs";

export interface DatosReporte {
  generadoEn: string;
  gestiones: Record<string, unknown>[];
  transacciones: Record<string, unknown>[];
  casas: Record<string, unknown>[];
  periodos: Record<string, unknown>[];
  pagos: Record<string, unknown>[];
  pagosMeses: Record<string, unknown>[];
  multas: Record<string, unknown>[];
  reservas: Record<string, unknown>[];
  campanas: Record<string, unknown>[];
  aportes: Record<string, unknown>[];
  documentos: Record<string, unknown>[];
}

const ENCABEZADO = (hoja: ExcelJS.Worksheet, campos: string[]) => {
  const fila = hoja.addRow(campos.map((c) => tituloCampo(c)));
  fila.font = { bold: true, color: { argb: "FFFFFFFF" } };
  fila.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF047857" } };
  hoja.columns.forEach((col) => {
    col.width = Math.max(14, ...(col.values ?? []).map((v) => String(v ?? "").length + 2));
  });
  hoja.views = [{ state: "frozen", ySplit: 1 }];
};

function tituloCampo(c: string): string {
  return c
    .replace(/_/g, " ")
    .replace(/^./, (ch) => ch.toUpperCase());
}

function hojaDatos(
  wb: ExcelJS.Workbook,
  nombre: string,
  filas: Record<string, unknown>[]
): void {
  const hoja = wb.addWorksheet(nombre);
  if (filas.length === 0) {
    hoja.addRow(["(sin registros)"]);
    return;
  }
  const campos = Object.keys(filas[0]);
  ENCABEZADO(hoja, campos);
  for (const fila of filas) {
    hoja.addRow(campos.map((c) => normalizar(fila[c])));
  }
}

function normalizar(v: unknown): string | number | boolean | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "object") return JSON.stringify(v);
  if (typeof v === "boolean") return v ? "sí" : "no";
  return v as string | number;
}

export async function generarWorkbook(d: DatosReporte): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Condominio El Portal";
  wb.created = new Date(d.generadoEn);

  // Hoja resumen con los indicadores clave
  const resumen = wb.addWorksheet("Resumen");
  resumen.columns = [{ width: 34 }, { width: 24 }];
  resumen.addRow(["RESPALDO COMPLETO — Condominio El Portal"]).font = { bold: true, size: 14 };
  resumen.addRow(["Generado", d.generadoEn]);
  // Rango real de los datos: demuestra que el archivo cubre todo el histórico
  const fechas = d.transacciones.map((x) => String(x.fecha ?? "")).filter(Boolean).sort();
  resumen.addRow(["Los datos de este archivo abarcan desde", fechas[0] ?? "(sin movimientos)"]);
  resumen.addRow(["hasta", fechas[fechas.length - 1] ?? "(sin movimientos)"]);
  resumen.addRow(["Este archivo contiene TODO el histórico, no solo un día"]);
  resumen.addRow([]);
  const vigentes = d.transacciones.filter((t) => !t.anulado);
  const ingresos = vigentes
    .filter((t) => t.tipo === "ingreso")
    .reduce((a, t) => a + Number(t.monto ?? 0), 0);
  const egresos = vigentes
    .filter((t) => t.tipo === "egreso")
    .reduce((a, t) => a + Number(t.monto ?? 0), 0);
  const gestionActiva = d.gestiones.find((g) => !g.cerrada);
  const saldoInicial = gestionActiva ? Number(gestionActiva.saldo_inicial ?? 0) : 0;
  resumen.addRow(["INDICADORES"]).font = { bold: true };
  resumen.addRow(["Gestión activa", gestionActiva?.nombre ?? "(ninguna)"]);
  resumen.addRow(["Responsable", gestionActiva?.responsable_nombre ?? "—"]);
  resumen.addRow(["Total ingresos (todas las gestiones)", ingresos]);
  resumen.addRow(["Total egresos", egresos]);
  resumen.addRow(["Saldo contable", saldoInicial + ingresos - egresos]);
  resumen.addRow(["Multas impagas", d.multas.filter((m) => m.estado === "impaga").length]);
  resumen.addRow(["Reservas vigentes", d.reservas.filter((r) => r.estado === "vigente").length]);
  resumen.addRow(["Campañas activas", d.campanas.filter((c) => c.estado === "activa").length]);
  resumen.addRow(["Casas registradas", d.casas.length]);
  resumen.addRow(["Documentos", d.documentos.length]);

  hojaDatos(wb, "Gestiones", d.gestiones);
  hojaDatos(wb, "Transacciones", d.transacciones);
  hojaDatos(wb, "Casas", d.casas);
  hojaDatos(wb, "Expensas - Periodos", d.periodos);
  hojaDatos(wb, "Expensas - Pagos", d.pagos);
  hojaDatos(wb, "Expensas - Pagos por mes", d.pagosMeses);
  hojaDatos(wb, "Multas", d.multas);
  hojaDatos(wb, "Reservas salon", d.reservas);
  hojaDatos(wb, "Campanas", d.campanas);
  hojaDatos(wb, "Aportes", d.aportes);
  hojaDatos(wb, "Documentos", d.documentos);

  return new Uint8Array(await wb.xlsx.writeBuffer());
}

/** Nombre estándar: respaldo-completo-2026-10-11.xlsx (contiene TODO el histórico; la fecha es de generación). */
export function nombreSnapshot(fecha = new Date()): string {
  return `respaldo-completo-${fecha.toISOString().slice(0, 10)}.xlsx`;
}
