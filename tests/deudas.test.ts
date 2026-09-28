import { describe, expect, it } from "vitest";
import { estadoMes, deudasCasa } from "../src/lib/deudas";

const HOY = "2026-09-26";

describe("estadoMes (RF-10..13)", () => {
  it("sin período definido → sin_periodo", () => {
    expect(
      estadoMes({ mes: "2026-09", fechaLimite: null, pagadoEnFecha: null, hoy: HOY, sinPeriodo: true })
    ).toBe("sin_periodo");
  });

  it("impago con límite no vencido → debe", () => {
    expect(
      estadoMes({ mes: "2026-09", fechaLimite: "2026-10-10", pagadoEnFecha: null, hoy: HOY })
    ).toBe("debe");
  });

  it("impago con límite vencido → vencido (RF-11)", () => {
    expect(
      estadoMes({ mes: "2026-08", fechaLimite: "2026-09-10", pagadoEnFecha: null, hoy: HOY })
    ).toBe("vencido");
  });

  it("impago SIN fecha límite → debe, nunca vence (RF-7)", () => {
    expect(
      estadoMes({ mes: "2026-01", fechaLimite: null, pagadoEnFecha: null, hoy: HOY })
    ).toBe("debe");
  });

  it("pagado antes del límite → pagado", () => {
    expect(
      estadoMes({
        mes: "2026-08",
        fechaLimite: "2026-09-10",
        pagadoEnFecha: "2026-09-01",
        hoy: HOY,
      })
    ).toBe("pagado");
  });

  it("pagado después del límite → pagado_vencido, ya no bloquea (RF-12)", () => {
    expect(
      estadoMes({
        mes: "2026-08",
        fechaLimite: "2026-09-10",
        pagadoEnFecha: "2026-09-20",
        hoy: HOY,
      })
    ).toBe("pagado_vencido");
  });

  it("límite exactamente hoy: aún no vence (paga el último día)", () => {
    expect(
      estadoMes({ mes: "2026-09", fechaLimite: HOY, pagadoEnFecha: null, hoy: HOY })
    ).toBe("debe");
  });

  it("cambiar la fecha límite recalcula (RF-13)", () => {
    const antes = estadoMes({
      mes: "2026-08", fechaLimite: "2026-09-10", pagadoEnFecha: null, hoy: HOY,
    });
    const despues = estadoMes({
      mes: "2026-08", fechaLimite: "2026-12-31", pagadoEnFecha: null, hoy: HOY,
    });
    expect(antes).toBe("vencido");
    expect(despues).toBe("debe");
  });
});

describe("deudasCasa (RF-5, RF-6, RF-7)", () => {
  const sinMultas = [
    { casa_id: "c1", monto: 0, motivo: "", estado: "pagada" as const },
  ];
  const mesesLibres = [
    { mes: "2026-09", monto: 180, fechaLimite: "2026-10-10", pagadoEnFecha: null },
  ];

  it("sin deudas → no bloqueada, sin motivos", () => {
    const r = deudasCasa({
      casaId: "c1",
      multas: sinMultas,
      meses: mesesLibres,
      hoy: HOY,
    });
    expect(r.bloqueada).toBe(false);
    expect(r.motivos).toEqual([]);
  });

  it("multa impaga bloquea con motivo exacto (monto y razón)", () => {
    const r = deudasCasa({
      casaId: "c1",
      multas: [
        { casa_id: "c1", monto: 200, motivo: "ruido en la madrugada", estado: "impaga" },
      ],
      meses: mesesLibres,
      hoy: HOY,
    });
    expect(r.bloqueada).toBe(true);
    expect(r.motivos[0]).toMatch(/multa impaga de 200,00 Bs por ruido en la madrugada/i);
  });

  it("expensa vencida bloquea con mes y fecha", () => {
    const r = deudasCasa({
      casaId: "c1",
      multas: sinMultas,
      meses: [
        { mes: "2026-08", monto: 150, fechaLimite: "2026-09-10", pagadoEnFecha: null },
      ],
      hoy: HOY,
    });
    expect(r.bloqueada).toBe(true);
    expect(r.motivos[0]).toMatch(/expensa de 2026-08 vencida el 2026-09-10/i);
  });

  it("debe SIN fecha límite NO bloquea (RF-7)", () => {
    const r = deudasCasa({
      casaId: "c1",
      multas: sinMultas,
      meses: [{ mes: "2026-08", monto: 150, fechaLimite: null, pagadoEnFecha: null }],
      hoy: HOY,
    });
    expect(r.bloqueada).toBe(false);
  });

  it("pagado_vencido NO bloquea (RF-12)", () => {
    const r = deudasCasa({
      casaId: "c1",
      multas: sinMultas,
      meses: [
        {
          mes: "2026-08", monto: 150, fechaLimite: "2026-09-10",
          pagadoEnFecha: "2026-09-20",
        },
      ],
      hoy: HOY,
    });
    expect(r.bloqueada).toBe(false);
  });

  it("multas de OTRA casa no bloquean; anuladas tampoco", () => {
    const r = deudasCasa({
      casaId: "c1",
      multas: [
        { casa_id: "c2", monto: 200, motivo: "otra casa", estado: "impaga" },
        { casa_id: "c1", monto: 100, motivo: "anulada", estado: "anulada" },
      ],
      meses: mesesLibres,
      hoy: HOY,
    });
    expect(r.bloqueada).toBe(false);
  });

  it("saldar (multa pagada + expensa pagada) desbloquea (RF-6)", () => {
    const r = deudasCasa({
      casaId: "c1",
      multas: [{ casa_id: "c1", monto: 200, motivo: "x", estado: "pagada" }],
      meses: [
        { mes: "2026-08", monto: 150, fechaLimite: "2026-09-10", pagadoEnFecha: "2026-09-05" },
      ],
      hoy: HOY,
    });
    expect(r.bloqueada).toBe(false);
  });

  it("lista todos los motivos cuando hay varias deudas", () => {
    const r = deudasCasa({
      casaId: "c1",
      multas: [{ casa_id: "c1", monto: 200, motivo: "ruido", estado: "impaga" }],
      meses: [
        { mes: "2026-07", monto: 150, fechaLimite: "2026-08-10", pagadoEnFecha: null },
        { mes: "2026-08", monto: 150, fechaLimite: "2026-09-10", pagadoEnFecha: null },
      ],
      hoy: HOY,
    });
    expect(r.bloqueada).toBe(true);
    expect(r.motivos).toHaveLength(3);
  });
});
