"use client";

import { useState } from "react";
import { formatBs } from "@/lib/contabilidad";

interface Casa {
  id: string;
  numero: number;
  vecino_nombre: string;
}

interface PagoDetalle {
  id: string;
  monto_total: number;
  comprobante_url: string | null;
  fecha_pago: string;
}

const MESES_CORTOS = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

function mesCorto(mes: string): string {
  const m = Number(mes.slice(5, 7));
  return MESES_CORTOS[m - 1] ?? mes;
}

/** RF-12/RF-13 (Spec-005): grilla casas × meses con 4 estados; celda pagada abre detalle. */
export function GrillaExpensas({
  casas,
  periodos,
  grilla,
  pagosPorCasaMes,
  esResponsable,
}: {
  casas: Casa[];
  periodos: { mes: string; monto: number; fecha_limite?: string | null }[];
  grilla: Record<string, Record<string, { estado: string; monto: number }>>;
  pagosPorCasaMes: Record<string, Record<string, PagoDetalle>>;
  esResponsable: boolean;
}) {
  const [detalle, setDetalle] = useState<{ casa: Casa; mes: string; pago: PagoDetalle } | null>(null);

  // Totales por mes y deudores del último mes
  const totalPorMes: Record<string, number> = {};
  const deudoresUltimo: Casa[] = [];
  const ultimoMes = periodos[periodos.length - 1]?.mes;
  for (const { mes } of periodos) totalPorMes[mes] = 0;
  for (const casa of casas) {
    for (const { mes } of periodos) {
      const c = grilla[casa.id]?.[mes];
      if (c && (c.estado === "pagado" || c.estado === "pagado_vencido")) {
        totalPorMes[mes] += c.monto;
      }
    }
    const est = ultimoMes ? grilla[casa.id]?.[ultimoMes]?.estado : null;
    if (ultimoMes && (est === "debe" || est === "vencido")) {
      deudoresUltimo.push(casa);
    }
  }

  return (
    <div className="mt-6">
      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[480px] text-sm">
          <thead className="bg-white/5 text-xs uppercase text-slate-400">
            <tr>
              <th className="px-3 py-3 text-left">Casa</th>
              {periodos.map((p) => (
                <th key={p.mes} className="px-2 py-3 text-center">
                  {mesCorto(p.mes)}
                  <span className="block text-[10px] normal-case text-slate-500">
                    {formatBs(p.monto)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {casas.map((casa) => (
              <tr key={casa.id} className="border-t border-white/5">
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className="font-semibold">Casa {casa.numero}</span>
                  <span className="ml-2 hidden text-xs text-slate-400 sm:inline">
                    {casa.vecino_nombre}
                  </span>
                </td>
                {periodos.map((p) => {
                  const celda = grilla[casa.id]?.[p.mes];
                  const pago = pagosPorCasaMes[casa.id]?.[p.mes];
                  const estado = celda?.estado ?? "debe";
                  if ((estado === "pagado" || estado === "pagado_vencido") && pago) {
                    return (
                      <td key={p.mes} className="px-2 py-2 text-center">
                        <button
                          onClick={() => setDetalle({ casa, mes: p.mes, pago })}
                          title={estado === "pagado_vencido" ? "Pagó después de la fecha límite" : undefined}
                          className={`w-full rounded-lg px-2 py-1 text-xs font-semibold ring-1 ring-inset ${
                            estado === "pagado"
                              ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30 hover:bg-emerald-500/25"
                              : "bg-emerald-500/10 text-emerald-400/80 ring-emerald-500/20 hover:bg-emerald-500/20"
                          }`}
                        >
                          {estado === "pagado_vencido" ? "pagó tarde" : "pagado"}
                        </button>
                      </td>
                    );
                  }
                  if (estado === "vencido") {
                    return (
                      <td key={p.mes} className="px-2 py-2 text-center">
                        <span
                          title={`Venció el ${p.fecha_limite}`}
                          className="inline-block w-full rounded-lg bg-red-500/25 px-2 py-1 text-xs font-bold text-red-300 ring-1 ring-inset ring-red-500/50"
                        >
                          vencido
                        </span>
                      </td>
                    );
                  }
                  return (
                    <td key={p.mes} className="px-2 py-2 text-center">
                      <span className="inline-block w-full rounded-lg bg-slate-500/10 px-2 py-1 text-xs font-semibold text-slate-400">
                        debe
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="border-t border-white/10 bg-white/5">
              <td className="px-3 py-2 text-xs font-semibold uppercase text-slate-400">
                Total del mes
              </td>
              {periodos.map((p) => (
                <td
                  key={p.mes}
                  className="px-2 py-2 text-center text-xs font-bold text-emerald-400"
                >
                  {formatBs(Math.round(totalPorMes[p.mes] * 100) / 100)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {ultimoMes && deudoresUltimo.length > 0 && (
        <p className="mt-3 text-sm text-amber-400">
          Sin pagar {mesCorto(ultimoMes)}: {deudoresUltimo.map((c) => c.numero).join(", ")}
        </p>
      )}

      {detalle && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
          onClick={() => setDetalle(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold">
              Casa {detalle.casa.numero} — {mesCorto(detalle.mes)}
            </h3>
            <p className="mt-1 text-sm text-slate-300">{detalle.casa.vecino_nombre}</p>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-400">Monto del mes</dt>
                <dd className="font-semibold">{formatBs(detalle.pago.monto_total)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Fecha de pago</dt>
                <dd>{detalle.pago.fecha_pago}</dd>
              </div>
            </dl>
            {detalle.pago.comprobante_url && (
              <a
                href={detalle.pago.comprobante_url}
                target="_blank"
                rel="noreferrer"
                className="mt-4 block rounded-lg bg-emerald-500 py-2 text-center text-sm font-semibold text-slate-950"
              >
                Ver comprobante
              </a>
            )}
            {esResponsable && (
              <AnularBoton pagoId={detalle.pago.id} onHecho={() => setDetalle(null)} />
            )}
            <button
              onClick={() => setDetalle(null)}
              className="mt-2 w-full rounded-lg border border-white/15 py-2 text-sm"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AnularBoton({ pagoId, onHecho }: { pagoId: string; onHecho: () => void }) {
  const [motivo, setMotivo] = useState("");
  const [activo, setActivo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function anular() {
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch(`/api/expensas/${pagoId}/anular`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? "No se pudo anular");
        return;
      }
      onHecho();
      window.location.reload();
    } finally {
      setEnviando(false);
    }
  }

  if (!activo) {
    return (
      <button
        onClick={() => setActivo(true)}
        className="mt-3 w-full rounded-lg border border-red-400/40 py-2 text-sm font-semibold text-red-300"
      >
        Anular pago (responsable)
      </button>
    );
  }
  return (
    <div className="mt-3">
      <input
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        placeholder="Motivo (obligatorio)"
        className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm"
      />
      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
      <button
        onClick={anular}
        disabled={enviando || !motivo.trim()}
        className="mt-2 w-full rounded-lg bg-red-500 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {enviando ? "Anulando…" : "Confirmar anulación"}
      </button>
    </div>
  );
}
