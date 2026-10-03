/** Spec-008 T1: vista mensual del libro — filtro y saldos que cuadran. */
import { describe, expect, it } from "vitest";
import {
  filtrarPorMes,
  mesesConMovimientos,
  resumenMes,
  saldoGestion,
  saldoInicialMes,
  type TransaccionMensual,
} from "@/lib/contabilidad";

const trans: TransaccionMensual[] = [
  { tipo: "ingreso", monto: 100, fecha: "2026-09-05" },
  { tipo: "egreso", monto: 30, fecha: "2026-09-20" },
  { tipo: "ingreso", monto: 50, fecha: "2026-10-02" },
  { tipo: "egreso", monto: 20, fecha: "2026-10-15", anulado: true },
  { tipo: "egreso", monto: 10, fecha: "2026-10-18" },
];

describe("filtrarPorMes", () => {
  it("todo devuelve todo", () => {
    expect(filtrarPorMes(trans, "todo")).toHaveLength(5);
  });
  it("filtra por mes incluyendo anulados en la lista", () => {
    expect(filtrarPorMes(trans, "2026-10")).toHaveLength(3);
    expect(filtrarPorMes(trans, "2026-11")).toHaveLength(0);
  });
});

describe("mesesConMovimientos", () => {
  it("lista meses de nuevo a viejo", () => {
    expect(mesesConMovimientos(trans)).toEqual(["2026-10", "2026-09"]);
  });
});

describe("saldoInicialMes", () => {
  it("sin previos es el saldo inicial de la gestión", () => {
    expect(saldoInicialMes(trans, "2026-09", 200)).toBe(200);
  });
  it("suma solo vigentes anteriores al mes", () => {
    // 200 + 100 − 30 = 270 (el anulado de octubre aún no cuenta, es del propio mes)
    expect(saldoInicialMes(trans, "2026-10", 200)).toBe(270);
  });
});

describe("resumenMes", () => {
  it("tarjeta de septiembre", () => {
    expect(resumenMes(trans, "2026-09", 200)).toEqual({
      inicio: 200,
      ingresos: 100,
      egresos: 30,
      fin: 270,
    });
  });
  it("excluye anulados del mes", () => {
    expect(resumenMes(trans, "2026-10", 200)).toEqual({
      inicio: 270,
      ingresos: 50,
      egresos: 10,
      fin: 310,
    });
  });
  it("el fin de mes cuadra con el saldo del libro hasta ese mes (constitución #9)", () => {
    const hastaOct = trans.filter((t) => t.fecha.slice(0, 7) <= "2026-10");
    expect(resumenMes(trans, "2026-10", 200).fin).toBe(saldoGestion(hastaOct, 200));
  });
});
