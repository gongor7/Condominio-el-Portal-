import { describe, expect, it } from "vitest";
import { cuadraCampanasLibro } from "../src/lib/contabilidad";

describe("cuadraCampanasLibro (Spec-011)", () => {
  it("cuadra cuando las campañas subidas igualan los ingresos del libro", () => {
    expect(
      cuadraCampanasLibro(
        [
          { transaccion_id: "t1", recaudado: 1500 },
          { transaccion_id: "t2", recaudado: 620 },
          { transaccion_id: null, recaudado: 3000 }, // aún no subida: no cuenta
        ],
        2120
      )
    ).toBe(true);
  });

  it("detecta descuadre si falta o sobra ingreso", () => {
    const campanas = [{ transaccion_id: "t1", recaudado: 1500 }];
    expect(cuadraCampanasLibro(campanas, 1400)).toBe(false);
    expect(cuadraCampanasLibro(campanas, 1600)).toBe(false);
  });

  it("sin campañas subidas espera cero ingresos", () => {
    expect(cuadraCampanasLibro([{ transaccion_id: null, recaudado: 500 }], 0)).toBe(true);
  });
});
