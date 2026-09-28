"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Gavel, Ban, CircleCheck } from "lucide-react";
import { formatBs } from "@/lib/contabilidad";

interface CasaEstado {
  casa: { id: string; numero: number; vecino_nombre: string };
  multas: {
    id: string;
    monto: number;
    motivo: string;
    estado: "impaga" | "pagada" | "anulada";
    fecha: string;
  }[];
  meses: {
    mes: string;
    monto: number;
    fecha_limite: string | null;
    estado: string;
  }[];
  resumen: {
    multasImpagas: number;
    totalImpago: number;
    mesesVencidos: number;
    mesesDebe: number;
    alDia: boolean;
  };
  pagosExpensas: {
    id: string;
    monto_total: number;
    comprobante_url: string | null;
    fecha_pago: string;
    meses: string[];
  }[];
}

const ESTILOS: Record<string, string> = {
  pagado: "bg-emerald-500/15 text-emerald-300",
  pagado_vencido: "bg-emerald-500/10 text-emerald-400/80",
  vencido: "bg-red-500/25 text-red-300 font-bold",
  debe: "bg-slate-500/10 text-slate-400",
};

/** RF-14/RF-15: lista de casas con estado y detalle expandible; admin del responsable. */
export function CasasLista({
  casasEstado,
  esResponsable,
}: {
  casasEstado: CasaEstado[];
  esResponsable: boolean;
}) {
  const router = useRouter();
  const [abierta, setAbierta] = useState<string | null>(null);
  const [multando, setMultando] = useState<CasaEstado | null>(null);

  return (
    <div className="mt-6 space-y-2">
      {casasEstado.map((c) => {
        const ab = abierta === c.casa.id;
        return (
          <div key={c.casa.id} className="rounded-2xl border border-white/10 bg-white/5">
            <button
              onClick={() => setAbierta(ab ? null : c.casa.id)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="font-semibold">Casa {c.casa.numero}</span>
                <span className="hidden truncate text-sm text-slate-400 sm:inline">
                  {c.casa.vecino_nombre}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2 text-xs">
                {c.resumen.alDia ? (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 font-semibold text-emerald-300">
                    <CircleCheck className="h-3.5 w-3.5" /> al día
                  </span>
                ) : (
                  <>
                    {c.resumen.multasImpagas > 0 && (
                      <span className="rounded-full bg-red-500/20 px-2.5 py-1 font-semibold text-red-300">
                        {c.resumen.multasImpagas} multa(s) · {formatBs(c.resumen.totalImpago)}
                      </span>
                    )}
                    {c.resumen.mesesVencidos > 0 && (
                      <span className="rounded-full bg-amber-500/15 px-2.5 py-1 font-semibold text-amber-300">
                        {c.resumen.mesesVencidos} vencida(s)
                      </span>
                    )}
                    {c.resumen.mesesDebe - c.resumen.mesesVencidos > 0 && (
                      <span className="rounded-full bg-slate-500/15 px-2.5 py-1 text-slate-300">
                        {c.resumen.mesesDebe - c.resumen.mesesVencidos} debe
                      </span>
                    )}
                  </>
                )}
                <ChevronDown
                  className={`h-4 w-4 text-slate-400 transition ${ab ? "rotate-180" : ""}`}
                />
              </span>
            </button>

            {ab && (
              <div className="border-t border-white/5 px-4 py-4">
                {/* Expensas de la casa */}
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Expensas
                </h4>
                {c.meses.length === 0 ? (
                  <p className="mt-1 text-sm text-slate-500">Sin períodos definidos.</p>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {c.meses.map((m) => (
                      <span
                        key={m.mes}
                        title={m.fecha_limite ? `Límite: ${m.fecha_limite}` : "Sin fecha límite"}
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${ESTILOS[m.estado] ?? ESTILOS.debe}`}
                      >
                        {m.mes} ·{" "}
                        {m.estado === "pagado"
                          ? "pagado"
                          : m.estado === "pagado_vencido"
                            ? "pagó tarde"
                            : m.estado}
                      </span>
                    ))}
                  </div>
                )}

                {/* Multas de la casa */}
                <h4 className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Multas
                </h4>
                {c.multas.length === 0 ? (
                  <p className="mt-1 text-sm text-slate-500">Sin multas.</p>
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {c.multas.map((m) => (
                      <li
                        key={m.id}
                        className={`flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-slate-900/60 px-3 py-2 text-sm ${
                          m.estado === "anulada" ? "opacity-50 line-through" : ""
                        }`}
                      >
                        <span className="min-w-0">
                          <b>{formatBs(m.monto)}</b>
                          <span className="ml-2 text-slate-400">{m.motivo}</span>
                          <span className="ml-2 text-xs text-slate-500">{m.fecha}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          <span
                            className={`text-xs font-semibold ${
                              m.estado === "impaga"
                                ? "text-red-300"
                                : m.estado === "pagada"
                                  ? "text-emerald-300"
                                  : "text-slate-400"
                            }`}
                          >
                            {m.estado}
                          </span>
                          {m.estado === "impaga" && (
                            <a
                              href={`/panel/multas/${m.id}/pagar`}
                              className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-slate-950"
                            >
                              Pagar
                            </a>
                          )}
                          {esResponsable && m.estado === "impaga" && (
                            <AnularMulta multaId={m.id} onHecho={() => router.refresh()} />
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Historial de pagos */}
                {c.pagosExpensas.length > 0 && (
                  <>
                    <h4 className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Pagos de expensas
                    </h4>
                    <ul className="mt-2 space-y-1 text-sm">
                      {c.pagosExpensas.map((p) => (
                        <li key={p.id} className="flex items-center justify-between">
                          <span>
                            {p.fecha_pago} · {p.meses.join(", ")}
                            {p.comprobante_url && (
                              <a
                                href={p.comprobante_url}
                                target="_blank"
                                rel="noreferrer"
                                className="ml-2 text-xs text-emerald-300 underline"
                              >
                                comprobante
                              </a>
                            )}
                          </span>
                          <b className="text-emerald-400">{formatBs(p.monto_total)}</b>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {esResponsable && (
                  <button
                    onClick={() => setMultando(c)}
                    className="mt-4 flex items-center gap-1.5 rounded-full border border-red-400/40 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/10"
                  >
                    <Gavel className="h-3.5 w-3.5" /> Multar a esta casa
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {multando && (
        <ModalMultar
          casa={multando.casa}
          onCerrar={() => setMultando(null)}
          onHecho={() => {
            setMultando(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function ModalMultar({
  casa,
  onCerrar,
  onHecho,
}: {
  casa: { id: string; numero: number; vecino_nombre: string };
  onCerrar: () => void;
  onHecho: () => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [monto, setMonto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function multar() {
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch("/api/multas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ casa_id: casa.id, motivo, monto: Number(monto) }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? "No se pudo multar");
        return;
      }
      onHecho();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-5">
        <h3 className="font-semibold">
          Multar Casa {casa.numero} — {casa.vecino_nombre}
        </h3>
        <label className="mt-4 block text-sm">
          Motivo (obligatorio)
          <input
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej. ruido después de las 23:00"
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2"
          />
        </label>
        <label className="mt-3 block text-sm">
          Monto (Bs)
          <input
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            inputMode="decimal"
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2"
          />
        </label>
        {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
        <div className="mt-4 flex gap-2">
          <button
            onClick={multar}
            disabled={enviando || !motivo.trim() || !monto}
            className="flex-1 rounded-lg bg-red-500 py-2 font-semibold text-white disabled:opacity-50"
          >
            {enviando ? "Multando…" : "Crear multa"}
          </button>
          <button
            onClick={onCerrar}
            className="rounded-lg border border-white/15 px-4 py-2 text-sm"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

function AnularMulta({ multaId, onHecho }: { multaId: string; onHecho: () => void }) {
  const [motivo, setMotivo] = useState("");
  const [activo, setActivo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function anular() {
    const res = await fetch(`/api/multas/${multaId}/anular`, {
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
  }

  if (!activo) {
    return (
      <button
        onClick={() => setActivo(true)}
        aria-label="Anular multa"
        className="rounded-full p-1 hover:bg-red-500/20"
      >
        <Ban className="h-3.5 w-3.5 text-red-400" />
      </button>
    );
  }
  return (
    <span className="flex items-center gap-1">
      <input
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        placeholder="Motivo"
        className="w-24 rounded border border-white/10 bg-slate-950 px-2 py-1 text-xs"
      />
      <button
        onClick={anular}
        disabled={!motivo.trim()}
        className="rounded bg-red-500 px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
      >
        OK
      </button>
      {error && <span className="text-xs text-red-300">{error}</span>}
    </span>
  );
}
