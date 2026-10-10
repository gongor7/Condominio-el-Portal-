import { describe, expect, it } from "vitest";
import { generarCaptcha, validarCaptcha } from "../src/lib/captcha";

describe("generarCaptcha", () => {
  it("genera pregunta y respuesta numérica coherente", () => {
    for (let i = 0; i < 20; i++) {
      const r = generarCaptcha();
      expect(r.pregunta).toMatch(/^¿Cuánto es \d+ [+\u2212] \d+\?$/);
      expect(Number(r.respuesta)).toBeGreaterThanOrEqual(1);
      expect(Number(r.respuesta)).toBeLessThanOrEqual(19);
    }
  });
});

describe("validarCaptcha", () => {
  it("acepta la respuesta exacta y con espacios", () => {
    expect(validarCaptcha("12", "12")).toBe(true);
    expect(validarCaptcha(" 12 ", "12")).toBe(true);
  });

  it("rechaza respuestas incorrectas", () => {
    expect(validarCaptcha("11", "12")).toBe(false);
    expect(validarCaptcha("", "12")).toBe(false);
    expect(validarCaptcha("abc", "12")).toBe(false);
  });
});
