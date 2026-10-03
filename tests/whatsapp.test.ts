import { describe, expect, it } from "vitest";
import { linkWhatsApp, normalizarTelefono } from "../src/lib/whatsapp";

describe("normalizarTelefono (Bolivia +591)", () => {
  it("8 dígitos → agrega lada 591", () => {
    expect(normalizarTelefono("70123456")).toBe("59170123456");
  });
  it("con +591 se conserva", () => {
    expect(normalizarTelefono("+591 70123456")).toBe("59170123456");
  });
  it("con 591 directo se conserva", () => {
    expect(normalizarTelefono("59170123456")).toBe("59170123456");
  });
  it("espacios y guiones se limpian", () => {
    expect(normalizarTelefono("7012-3456")).toBe("59170123456");
  });
  it("longitud inválida → null", () => {
    expect(normalizarTelefono("123")).toBeNull();
    expect(normalizarTelefono("1234567890123")).toBeNull();
    expect(normalizarTelefono("")).toBeNull();
  });
});

describe("linkWhatsApp", () => {
  it("arma el link con mensaje precargado", () => {
    expect(linkWhatsApp("70123456", "Hola")).toBe(
      "https://wa.me/59170123456?text=Hola"
    );
  });
  it("sin teléfono válido → null", () => {
    expect(linkWhatsApp("", "Hola")).toBeNull();
    expect(linkWhatsApp(null, "Hola")).toBeNull();
  });
  it("codifica caracteres especiales del mensaje", () => {
    const l = linkWhatsApp("70123456", "multa de 150,50 Bs");
    expect(l).toContain(encodeURIComponent("150,50"));
  });
});
