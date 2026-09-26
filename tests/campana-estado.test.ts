import { describe, expect, it } from "vitest";
import { puedeAportar } from "../src/lib/contabilidad";

describe("puedeAportar (RF-8: transición activa→cerrada congela aportes)", () => {
  it("campaña activa con gestión abierta acepta aportes", () => {
    expect(
      puedeAportar({ estado: "activa", gestionCerrada: false })
    ).toEqual({ permitido: true, motivo: null });
  });

  it("campaña cerrada congela aportes", () => {
    const r = puedeAportar({ estado: "cerrada", gestionCerrada: false });
    expect(r.permitido).toBe(false);
    expect(r.motivo).toMatch(/campaña ya está cerrada/i);
  });

  it("campaña activa pero gestión cerrada también congela aportes (QA 14)", () => {
    const r = puedeAportar({ estado: "activa", gestionCerrada: true });
    expect(r.permitido).toBe(false);
    expect(r.motivo).toMatch(/gestión está cerrada/i);
  });
});
