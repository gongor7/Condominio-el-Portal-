import { describe, expect, it } from "vitest";
import { puedeCerrarGestion } from "../src/lib/contabilidad";

describe("puedeCerrarGestion (RF-10)", () => {
  it("permite cerrar sin campañas activas", () => {
    const r = puedeCerrarGestion({ campanasActivas: 0, saldoPendiente: 0 });
    expect(r.puedeCerrar).toBe(true);
    expect(r.bloqueos).toEqual([]);
  });

  it("permite cerrar con saldo pendiente (queda registrado, no bloquea)", () => {
    const r = puedeCerrarGestion({ campanasActivas: 0, saldoPendiente: 250 });
    expect(r.puedeCerrar).toBe(true);
  });

  it("bloquea si hay campañas activas (QA 10)", () => {
    const r = puedeCerrarGestion({ campanasActivas: 2, saldoPendiente: 0 });
    expect(r.puedeCerrar).toBe(false);
    expect(r.bloqueos).toHaveLength(1);
    expect(r.bloqueos[0]).toMatch(/2 campañas activas/);
  });

  it("bloquea con solo una campaña activa y lista todos los bloqueos", () => {
    const r = puedeCerrarGestion({ campanasActivas: 1, saldoPendiente: 100 });
    expect(r.puedeCerrar).toBe(false);
    expect(r.bloqueos[0]).toMatch(/1 campaña activa/);
  });
});
