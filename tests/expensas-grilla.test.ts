import { describe, expect, it } from "vitest";
import {
  estadosGrilla,
  totalExpensas,
  repartoMontos,
} from "../src/lib/expensas";

const casas = ["c1", "c2", "c3"];
const periodos = [
  { mes: "2026-08", monto: 150 },
  { mes: "2026-09", monto: 180 },
  { mes: "2026-10", monto: 200 },
];

describe("estadosGrilla (RF-12)", () => {
  const pagos = [
    { casa_id: "c1", mes: "2026-08", monto_mes: 150, vigente: true },
    { casa_id: "c1", mes: "2026-09", monto_mes: 180, vigente: true },
    { casa_id: "c2", mes: "2026-08", monto_mes: 150, vigente: false }, // anulado
  ];

  it("pagado / debe / sin_periodo por celda", () => {
    const g = estadosGrilla(casas, periodos, pagos);
    expect(g.c1["2026-08"].estado).toBe("pagado");
    expect(g.c1["2026-09"].estado).toBe("pagado");
    expect(g.c1["2026-10"].estado).toBe("debe");
    expect(g.c2["2026-08"].estado).toBe("debe"); // anulado → debe
    expect(g.c3["2026-08"].estado).toBe("debe");
  });

  it("celda pagada expone el monto con el que se pagó", () => {
    const g = estadosGrilla(casas, periodos, pagos);
    expect(g.c1["2026-08"].monto).toBe(150);
  });

  it("casa sin ninguna columna extra (mes sin período) es sin_periodo", () => {
    const g = estadosGrilla(casas, periodos, []);
    expect(g.c1["2030-01"]).toBeUndefined();
  });
});

describe("totalExpensas (cuadre, RF finalización)", () => {
  it("suma montos de pagos vigentes y excluye anulados", () => {
    const t = totalExpensas([
      { monto_total: 330, vigente: true },
      { monto_total: 150, vigente: true },
      { monto_total: 999, vigente: false },
    ]);
    expect(t).toBe(480);
  });
});

describe("repartoMontos (RF-10/RF-11: proporcional, ajuste al final)", () => {
  it("monto exacto se reparte según cada período", () => {
    const r = repartoMontos(330, ["2026-08", "2026-09"], periodos);
    expect(r).toEqual([
      { mes: "2026-08", monto_mes: 150 },
      { mes: "2026-09", monto_mes: 180 },
    ]);
  });

  it("sobrante queda íntegro en el último mes", () => {
    const r = repartoMontos(380, ["2026-08", "2026-09"], periodos);
    expect(r[0].monto_mes).toBe(150);
    expect(r[1].monto_mes).toBe(230); // 180 + 50 de sobrante
  });

  it("faltante se descuenta del último mes", () => {
    const r = repartoMontos(300, ["2026-08", "2026-09"], periodos);
    expect(r[0].monto_mes).toBe(150);
    expect(r[1].monto_mes).toBe(150); // 180 − 30
  });

  it("meses iguales y pago exacto reparte exacto", () => {
    const r = repartoMontos(300, ["2026-08", "2026-10"], periodos);
    expect(r).toEqual([
      { mes: "2026-08", monto_mes: 150 },
      { mes: "2026-10", monto_mes: 150 }, // 200 − 50 faltante
    ]);
  });

  it("un solo mes absorbe todo", () => {
    const r = repartoMontos(500, ["2026-10"], periodos);
    expect(r).toEqual([{ mes: "2026-10", monto_mes: 500 }]);
  });
});
