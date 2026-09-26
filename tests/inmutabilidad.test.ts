import { describe, expect, it } from "vitest";
import { puedeEscribirEnGestion } from "../src/lib/contabilidad";

describe("esGestionInmutable / puedeEscribirEnGestion (RF-10, QA 14/15)", () => {
  it("gestión cerrada rechaza toda escritura", () => {
    const r = puedeEscribirEnGestion({ cerrada: true });
    expect(r.permitido).toBe(false);
    expect(r.motivo).toMatch(/cerrada e inmutable/i);
  });

  it("gestión abierta permite escritura", () => {
    const r = puedeEscribirEnGestion({ cerrada: false });
    expect(r.permitido).toBe(true);
    expect(r.motivo).toBeNull();
  });

  it("gestión inexistente rechaza escritura", () => {
    const r = puedeEscribirEnGestion(null);
    expect(r.permitido).toBe(false);
    expect(r.motivo).toMatch(/no hay gestión activa/i);
  });
});
