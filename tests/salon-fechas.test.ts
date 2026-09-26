import { describe, expect, it } from "vitest";
import { fechaDisponible, esFechaValida } from "../src/lib/salon";

const HOY = "2026-09-26";

describe("esFechaValida (RF-3)", () => {
  it("acepta fechas de calendario reales", () => {
    expect(esFechaValida("2026-09-26")).toBe(true);
    expect(esFechaValida("2028-02-29")).toBe(true); // bisiesto válido
  });

  it("rechaza fechas inexistentes o mal formadas", () => {
    expect(esFechaValida("2026-02-30")).toBe(false);
    expect(esFechaValida("2027-02-29")).toBe(false); // no bisiesto
    expect(esFechaValida("26/09/2026")).toBe(false);
    expect(esFechaValida("")).toBe(false);
    expect(esFechaValida("")).toBe(false);
  });
});

describe("fechaDisponible (RF-4)", () => {
  const ocupadas = ["2026-10-03", "2026-10-17"];

  it("disponible si está libre y es hoy o futura", () => {
    expect(fechaDisponible("2026-10-10", ocupadas, HOY)).toBe(true);
    expect(fechaDisponible(HOY, ocupadas, HOY)).toBe(true); // hoy se puede reservar
  });

  it("no disponible si ya está reservada", () => {
    expect(fechaDisponible("2026-10-03", ocupadas, HOY)).toBe(false);
  });

  it("no disponible si es anterior a hoy", () => {
    expect(fechaDisponible("2026-09-25", ocupadas, HOY)).toBe(false);
  });

  it("maneja cruce de mes y fin de mes", () => {
    expect(fechaDisponible("2026-09-30", ocupadas, HOY)).toBe(true);
    expect(fechaDisponible("2026-10-01", ocupadas, HOY)).toBe(true);
    expect(fechaDisponible("2026-08-31", ocupadas, HOY)).toBe(false);
  });
});
