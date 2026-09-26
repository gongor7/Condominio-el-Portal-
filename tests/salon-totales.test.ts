import { describe, expect, it } from "vitest";
import {
  totalSalon,
  agruparPorMes,
  cuadraConLibro,
  mesActualAmericaLaPaz,
  ReservaBase,
} from "../src/lib/salon";

const r = (over: Partial<ReservaBase>): ReservaBase => ({
  id: "x",
  fecha: "2026-09-10",
  monto: 100,
  estado: "vigente",
  vecino_nombre: "Ana",
  ...over,
});

describe("totalSalon (RF-7)", () => {
  it("suma solo reservas vigentes con monto", () => {
    const total = totalSalon([
      r({ monto: 100 }),
      r({ monto: 250 }),
      r({ estado: "anulada", monto: 999 }),
      r({ monto: 0 }), // gratis no aporta
    ]);
    expect(total).toBe(350);
  });

  it("sin reservas da 0", () => {
    expect(totalSalon([])).toBe(0);
  });
});

describe("cuadraConLibro (RF-7, constitución #9)", () => {
  it("cuadra si el libro suma lo mismo (tolerancia 1 centavo)", () => {
    expect(cuadraConLibro(350, 350)).toBe(true);
    expect(cuadraConLibro(350, 350.005)).toBe(true);
  });

  it("descuadre detectado", () => {
    expect(cuadraConLibro(350, 300)).toBe(false);
    expect(cuadraConLibro(350, 0)).toBe(false);
  });
});

describe("agruparPorMes (RF-11, tz America/La_Paz)", () => {
  it("agrupa por mes y separa anuladas", () => {
    const g = agruparPorMes([
      r({ fecha: "2026-09-05", monto: 100 }),
      r({ fecha: "2026-09-28", monto: 50 }),
      r({ fecha: "2026-10-01", monto: 200 }),
      r({ fecha: "2026-09-15", monto: 999, estado: "anulada" }),
    ]);
    expect(g["2026-09"].totalMes).toBe(150);
    expect(g["2026-09"].anuladas).toHaveLength(1);
    expect(g["2026-10"].totalMes).toBe(200);
  });

  it("mes vacío no aparece", () => {
    expect(agruparPorMes([r({ fecha: "2026-11-01" })])["2026-10"]).toBeUndefined();
  });
});

describe("mesActualAmericaLaPaz (T4)", () => {
  it("03:30 UTC del 1-oct sigue siendo 30-sep en Bolivia (UTC-4)", () => {
    const d = new Date("2026-10-01T03:30:00Z");
    expect(mesActualAmericaLaPaz(d)).toBe("2026-09");
  });

  it("05:00 UTC del 1-oct ya es 1-oct en Bolivia", () => {
    const d = new Date("2026-10-01T05:00:00Z");
    expect(mesActualAmericaLaPaz(d)).toBe("2026-10");
  });

  it("00:30 UTC sigue siendo el mismo día en Bolivia", () => {
    const d = new Date("2026-09-15T00:30:00Z");
    expect(mesActualAmericaLaPaz(d)).toBe("2026-09");
  });
});
