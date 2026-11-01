import { describe, expect, it } from "vitest";
import { filtrarMovimientosLibro, normalizarTexto } from "../src/lib/contabilidad";

const TODOS = { texto: "", tipo: "todo" as const, categoria: "todas", incluirAnulados: true };

const movs = [
  { tipo: "ingreso", categoria: "expensas", descripcion: "Expensa 2026-10 — Casa 1", anulado: false },
  { tipo: "egreso", categoria: "limpieza", descripcion: "Limpieza de piscinas", anulado: false },
  { tipo: "ingreso", categoria: "pagos extraordinarios", descripcion: "Recaudación 'Bomba de agua': 12 aportes", anulado: false },
  { tipo: "egreso", categoria: "servicios básicos", descripcion: "Pago de luz noviembre", anulado: true },
];

describe("normalizarTexto", () => {
  it("minúsculas y sin acentos", () => {
    expect(normalizarTexto("Servicios BÁSICOS")).toBe("servicios basicos");
  });
});

describe("filtrarMovimientosLibro", () => {
  it("sin filtros devuelve todo", () => {
    expect(filtrarMovimientosLibro(movs, TODOS)).toHaveLength(4);
  });

  it("por tipo", () => {
    const r = filtrarMovimientosLibro(movs, { ...TODOS, tipo: "ingreso" });
    expect(r).toHaveLength(2);
    expect(r.every((t) => t.tipo === "ingreso")).toBe(true);
  });

  it("por categoría", () => {
    expect(
      filtrarMovimientosLibro(movs, { ...TODOS, categoria: "expensas" })
    ).toHaveLength(1);
  });

  it("búsqueda de texto ignora mayúsculas y acentos", () => {
    expect(filtrarMovimientosLibro(movs, { ...TODOS, texto: "BOMBA" })).toHaveLength(1);
    expect(filtrarMovimientosLibro(movs, { ...TODOS, texto: "basicos" })).toHaveLength(1);
    expect(filtrarMovimientosLibro(movs, { ...TODOS, texto: "casa 1" })).toHaveLength(1);
  });

  it("ocultar anulados", () => {
    const r = filtrarMovimientosLibro(movs, { ...TODOS, incluirAnulados: false });
    expect(r).toHaveLength(3);
    expect(r.some((t) => t.anulado)).toBe(false);
  });

  it("filtros combinados", () => {
    const r = filtrarMovimientosLibro(movs, {
      ...TODOS,
      tipo: "egreso",
      texto: "pago",
    });
    expect(r).toHaveLength(1); // el anulado "Pago de luz"
    const r2 = filtrarMovimientosLibro(movs, {
      ...TODOS,
      tipo: "egreso",
      texto: "pago",
      incluirAnulados: false,
    });
    expect(r2).toHaveLength(0);
  });
});
