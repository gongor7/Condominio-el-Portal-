import { describe, expect, it } from "vitest";
import { generarWorkbook, nombreSnapshot, type DatosReporte } from "../src/lib/reporte-excel";
import ExcelJS from "exceljs";

const datos: DatosReporte = {
  generadoEn: "2026-10-11T10:00:00.000Z",
  gestiones: [{ id: "g1", nombre: "Gestión 2026-2027", cerrada: false, saldo_inicial: 100 }],
  transacciones: [
    { id: "t1", tipo: "ingreso", monto: 500, anulado: false, categoria: "expensas" },
    { id: "t2", tipo: "egreso", monto: 120, anulado: false, categoria: "limpieza" },
    { id: "t3", tipo: "ingreso", monto: 999, anulado: true, categoria: "otros" },
  ],
  casas: [{ id: "c1", numero: 1, vecino_nombre: "Silvia Trigo", telefono: "59170123456" }],
  periodos: [{ mes: "2026-10", monto: 150, fecha_limite: "2026-11-10" }],
  pagos: [{ id: "p1", casa_id: "c1", monto_total: 150, estado: "vigente" }],
  pagosMeses: [{ casa_id: "c1", mes: "2026-10", monto_mes: 150, vigente: true }],
  multas: [
    { id: "m1", monto: 200, estado: "impaga", motivo: "ruido" },
    { id: "m2", monto: 50, estado: "pagada", motivo: "basura" },
  ],
  reservas: [{ id: "r1", fecha: "2026-12-24", estado: "vigente", monto: 350 }],
  campanas: [{ id: "k1", titulo: "Bomba de agua", estado: "activa" }],
  aportes: [{ id: "a1", vecino_nombre: "Casa 2", monto: 100 }],
  documentos: [],
};

describe("generarWorkbook", () => {
  it("crea un xlsx válido con las 12 hojas", async () => {
    const buf = await generarWorkbook(datos);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as unknown as ExcelJS.Buffer);
    const nombres = wb.worksheets.map((w) => w.name);
    expect(nombres).toContain("Resumen");
    expect(nombres).toContain("Transacciones");
    expect(nombres).toContain("Casas");
    expect(nombres).toContain("Multas");
    expect(nombres).toContain("Reservas salon");
    expect(nombres).toContain("Documentos");
    expect(nombres.length).toBe(12);
  });

  it("el resumen calcula ingresos y egresos excluyendo anulados", async () => {
    const buf = await generarWorkbook(datos);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as unknown as ExcelJS.Buffer);
    const resumen = wb.getWorksheet("Resumen")!;
    const texto = JSON.stringify(resumen.getSheetValues().flat());
    expect(texto).toContain("Gestión 2026-2027");
    // ingresos 500 y egresos 120, el anulado (999) excluido de ambos
    expect(texto).toContain("500");
    expect(texto).toContain("120");
    expect(texto).not.toContain("999");
    // saldo = 100 inicial + 500 − 120
    expect(texto).toContain("480");
  });

  it("hojas vacías muestran '(sin registros)'", async () => {
    const buf = await generarWorkbook({ ...datos, documentos: [] });
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as unknown as ExcelJS.Buffer);
    const hoja = wb.getWorksheet("Documentos")!;
    expect(String(hoja.getCell("A1").value)).toContain("sin registros");
  });
});

describe("nombreSnapshot", () => {
  it("formato reporte-YYYY-MM-DD.xlsx", () => {
    expect(nombreSnapshot(new Date("2026-10-11T12:00:00Z"))).toBe("reporte-2026-10-11.xlsx");
  });
});
