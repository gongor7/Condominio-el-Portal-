import { describe, expect, it } from "vitest";
import { progresoCampana } from "../src/lib/contabilidad";


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
