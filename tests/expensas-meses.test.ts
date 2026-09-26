import { describe, expect, it } from "vitest";
import { mesesPagables, totalEsperado } from "../src/lib/expensas";

const periodos = [
  { mes: "2026-06", monto: 150 },
  { mes: "2026-07", monto: 150 },
  { mes: "2026-08", monto: 180 }, // monto distinto: multi-monto real
  { mes: "2026-09", monto: 180 },
  { mes: "2026-10", monto: 200 }, // futuro
];

describe("mesesPagables (RF-7)", () => {
  it("mes actual + atrasados definidos y no pagados, nunca futuros", () => {
    const r = mesesPagables("2026-09", periodos, []);
    expect(r).toEqual(["2026-06", "2026-07", "2026-08", "2026-09"]);
  });

  it("excluye los meses ya pagados por la casa", () => {
    const r = mesesPagables("2026-09", periodos, ["2026-08"]);
    expect(r).toEqual(["2026-06", "2026-07", "2026-09"]);
  });

  it("excluye meses sin período definido (no aparece en periodos)", () => {
    const r = mesesPagables("2026-09", periodos.filter((p) => p.mes !== "2026-07"), []);
    expect(r).not.toContain("2026-07");
  });

  it("si todo lo pagable está pagado, devuelve vacío", () => {
    const r = mesesPagables(
      "2026-09",
      periodos,
      ["2026-06", "2026-07", "2026-08", "2026-09"]
    );
    expect(r).toEqual([]);
  });
});

describe("totalEsperado (RF-9: suma por mes, no N × monto)", () => {
  it("suma los montos de cada mes aunque difieran", () => {
    expect(totalEsperado(["2026-08", "2026-09"], periodos)).toBe(360); // 180+180
    expect(totalEsperado(["2026-06", "2026-07", "2026-08"], periodos)).toBe(480); // 150+150+180
  });

  it("un solo mes devuelve su monto exacto", () => {
    expect(totalEsperado(["2026-10"], periodos)).toBe(200);
  });

  it("si algún mes no tiene período, devuelve null (inválido)", () => {
    expect(totalEsperado(["2026-09", "2030-01"], periodos)).toBeNull();
  });

  it("lista vacía devuelve 0", () => {
    expect(totalEsperado([], periodos)).toBe(0);
  });
});
