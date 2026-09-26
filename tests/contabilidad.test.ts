import { describe, expect, it } from "vitest";
import {
  saldoGestion,
  totalesGestion,
  resumenCampana,
  validarTransaccion,
  formatBs,
} from "../src/lib/contabilidad";
import { extraerMonto, extraerFecha } from "../src/lib/ocr";

describe("saldoGestion", () => {
  it("calcula ingresos − egresos con saldo inicial", () => {
    const t = [
      { tipo: "ingreso" as const, monto: 1000 },
      { tipo: "egreso" as const, monto: 250 },
      { tipo: "egreso" as const, monto: 500 },
    ];
    expect(saldoGestion(t, 100)).toBe(350);
  });

  it("ignora transacciones anuladas", () => {
    const t = [
      { tipo: "ingreso" as const, monto: 100 },
      { tipo: "egreso" as const, monto: 50, anulado: true },
    ];
    expect(saldoGestion(t)).toBe(100);
  });

  it("puede quedar negativo", () => {
    expect(saldoGestion([{ tipo: "egreso", monto: 50 }], 10)).toBe(-40);
  });
});

describe("totalesGestion", () => {
  it("separa ingresos y egresos", () => {
    const t = [
      { tipo: "ingreso" as const, monto: 300 },
      { tipo: "egreso" as const, monto: 120 },
      { tipo: "ingreso" as const, monto: 80 },
    ];
    expect(totalesGestion(t)).toEqual({ ingresos: 380, egresos: 120 });
  });
});

describe("resumenCampana", () => {
  const base = {
    meta: 1000,
    estado: "activa" as const,
  };

  it("sobra cuando recaudado > gastado", () => {
    const r = resumenCampana({
      ...base,
      aportes: [600, 400],
      gastos: [900],
    });
    expect(r.estadoSugerido).toBe("sobra");
    expect(r.saldo).toBe(100);
    expect(r.faltante).toBe(0);
  });

  it("falta cuando los gastos superan lo recaudado", () => {
    const r = resumenCampana({ ...base, aportes: [500], gastos: [700] });
    expect(r.estadoSugerido).toBe("falta");
    expect(r.saldo).toBe(-200);
  });

  it("cuadra exacto", () => {
    const r = resumenCampana({ ...base, aportes: [500], gastos: [500] });
    expect(r.estadoSugerido).toBe("exacto");
  });

  it("sin meta, faltante es null", () => {
    const r = resumenCampana({ ...base, meta: null, aportes: [100], gastos: [] });
    expect(r.meta).toBeNull();
    expect(r.faltante).toBeNull();
  });

  it("faltante para llegar a la meta", () => {
    const r = resumenCampana({ ...base, aportes: [250], gastos: [] });
    expect(r.faltante).toBe(750);
  });
});

describe("validarTransaccion", () => {
  it("rechaza monto cero, tipo inválido y fecha mala", () => {
    expect(validarTransaccion({ tipo: "egreso", monto: 0, fecha: "2026-01-01" })).toBeTruthy();
    expect(validarTransaccion({ tipo: "otro", monto: 5, fecha: "2026-01-01" })).toBeTruthy();
    expect(validarTransaccion({ tipo: "egreso", monto: 5, fecha: "no-fecha" })).toBeTruthy();
    expect(validarTransaccion({ tipo: "egreso", monto: 5, fecha: "2026-01-01" })).toBeNull();
  });
});

describe("formatBs", () => {
  it("formatea con dos decimales", () => {
    expect(formatBs(1234.5)).toMatch(/1\.234,50/);
    expect(formatBs(-100)).toMatch(/−100,00/);
  });
});

describe("OCR: extraerMonto / extraerFecha", () => {
  it("extrae monto con formato boliviano", () => {
    expect(extraerMonto("TOTAL 1.250,50 Bs")).toBe(1250.5);
  });

  it("extrae monto decimal simple", () => {
    expect(extraerMonto("monto: 350.00")).toBe(350);
  });

  it("sin monto devuelve null", () => {
    expect(extraerMonto("sin números útiles aquí")).toBeNull();
  });

  it("extrae fecha yyyy-mm-dd", () => {
    expect(extraerFecha("Fecha: 2026-09-15")).toBe("2026-09-15");
  });

  it("extrae fecha dd/mm/yyyy", () => {
    expect(extraerFecha("15/09/2026")).toBe("2026-09-15");
  });

  it("extrae fecha en palabras", () => {
    expect(extraerFecha("Cochabamba, 3 de septiembre de 2026")).toBe(
      "2026-09-03"
    );
  });
});
