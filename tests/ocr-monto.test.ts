import { describe, expect, it } from "vitest";
import { extraerMonto } from "../src/lib/ocr";

describe("extraerMonto con separadores bolivianos", () => {
  it("formato es-BO completo: punto miles + coma decimal", () => {
    expect(extraerMonto("TOTAL 1.234,56 Bs")).toBe(1234.56);
    expect(extraerMonto("TOTAL Bs 25.350,00")).toBe(25350);
  });

  it("punto de miles SIN decimales: 1.500 es mil quinientos, no 1,5", () => {
    expect(extraerMonto("MONTO: 1.500")).toBe(1500);
    expect(extraerMonto("Bs 1.500")).toBe(1500);
    expect(extraerMonto("3.000 Bs")).toBe(3000);
  });

  it("coma decimal sin miles: 350,00 es trescientos cincuenta", () => {
    expect(extraerMonto("TOTAL 350,00 Bs")).toBe(350);
    expect(extraerMonto("TOTAL 350,50 Bs")).toBe(350.5);
  });

  it("coma como miles (estilo US sin decimales): 1,500 = mil quinientos", () => {
    expect(extraerMonto("TOTAL 1,500")).toBe(1500);
  });

  it("ambos separadores en montos grandes", () => {
    expect(extraerMonto("1.234.567,89 Bs")).toBe(1234567.89);
  });

  it("formato con punto decimal: 1234.56", () => {
    expect(extraerMonto("Total: 1234.56")).toBe(1234.56);
  });

  it("no confunde con las fechas: el monto gana sobre el año", () => {
    expect(extraerMonto("Fecha: 15/09/2026 Total: 350,00 Bs")).toBe(350);
    expect(extraerMonto("2026-09-15 PAGADO 1.800,00")).toBe(1800);
  });

  it("entero simple", () => {
    expect(extraerMonto("monto 350")).toBe(350);
  });

  it("sin números útiles devuelve null", () => {
    expect(extraerMonto("sin nada")).toBeNull();
  });
});
