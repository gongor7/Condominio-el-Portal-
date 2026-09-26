import { describe, expect, it } from "vitest";
import { compararMontos, progresoCampana } from "../src/lib/contabilidad";

describe("compararMontos (Spec-002 RF-3/4)", () => {
  it("coincide cuando el monto escrito es igual al detectado", () => {
    expect(compararMontos(150.5, 150.5)).toEqual({
      estado: "coincide",
      diferencia: 0,
    });
  });

  it("coincide con tolerancia de centavos por redondeo del OCR", () => {
    expect(compararMontos(150.5, 150.501).estado).toBe("coincide");
  });

  it("difiere cuando los montos no son iguales", () => {
    const r = compararMontos(100, 150);
    expect(r.estado).toBe("difiere");
    expect(r.diferencia).toBe(50);
  });

  it("sin_deteccion cuando el OCR no encontró monto", () => {
    expect(compararMontos(100, null).estado).toBe("sin_deteccion");
    expect(compararMontos(null, 100).estado).toBe("sin_deteccion");
  });
});

describe("progresoCampana (Spec-002 RF-5)", () => {
  it("calcula porcentaje sobre la meta, con tope 100", () => {
    expect(progresoCampana(810, 1300)).toBe(62);
    expect(progresoCampana(2000, 1300)).toBe(100);
  });

  it("sin meta devuelve null (solo total)", () => {
    expect(progresoCampana(500, null)).toBeNull();
  });

  it("meta cero o negativa se trata como sin meta", () => {
    expect(progresoCampana(500, 0)).toBeNull();
  });
});
