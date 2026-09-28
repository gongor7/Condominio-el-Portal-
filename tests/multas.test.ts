import { describe, expect, it } from "vitest";
import { totalMultasCobradas, montoCompleto, cuadraMultasLibro } from "../src/lib/deudas";

describe("montoCompleto (RF-3: la multa se paga entera)", () => {
  it("acepta el monto exacto", () => {
    expect(montoCompleto(200, 200)).toBe(true);
  });

  it("acepta centavos de tolerancia", () => {
    expect(montoCompleto(200.005, 200)).toBe(true);
  });

  it("rechaza pagos menores", () => {
    expect(montoCompleto(50, 200)).toBe(false);
    expect(montoCompleto(199.99, 200)).toBe(false);
  });

  it("acepta pagos mayores (queda registrado el monto real)", () => {
    expect(montoCompleto(250, 200)).toBe(true);
  });
});

describe("totalMultasCobradas (cuadre, constitución #9)", () => {
  it("suma solo las pagadas; impagas y anuladas fuera", () => {
    const t = totalMultasCobradas([
      { monto: 200, estado: "pagada" },
      { monto: 150, estado: "pagada" },
      { monto: 300, estado: "impaga" },
      { monto: 999, estado: "anulada" },
    ]);
    expect(t).toBe(350);
  });

  it("sin multas pagadas da 0", () => {
    expect(totalMultasCobradas([])).toBe(0);
  });
});

describe("cuadraMultasLibro", () => {
  it("cuadra con tolerancia de centavo", () => {
    expect(cuadraMultasLibro(350, 350)).toBe(true);
    expect(cuadraMultasLibro(350, 350.005)).toBe(true);
  });

  it("descuadre detectado", () => {
    expect(cuadraMultasLibro(350, 300)).toBe(false);
  });
});
