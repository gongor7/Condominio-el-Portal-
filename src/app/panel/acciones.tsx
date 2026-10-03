"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TriangleAlert, CircleCheck } from "lucide-react";
import { formatBs } from "@/lib/contabilidad";

interface EstadoCierre {
  campanasActivas: number;
  multasImpagas: number;
  multasTotal: number;
  expensasVencidas: number;
}

export function CerrarGestion({ gestionId }: { gestionId: string }) {
  const router = useRouter();
  const [estado, setEstado] = useState<EstadoCierre | null>(null);
  const [nota, setNota] = useState("");
  const [cerrarCampanas, setCerrarCampanas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function abrirChecklist() {
    setError(null);
    try {
      const res = await fetch("/api/gestiones/estado-cierre");
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? "No se pudo revisar los pendientes");
        return;
      }
      setEstado(d);
      setCerrarCampanas((d.campanasActivas ?? 0) > 0);
    } catch {
      setError("Error de conexión");
    }
  }

  async function cerrar() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`/api/gestiones/${gestionId}/cerrar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nota, cerrar_campanas: cerrarCampanas }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? "No se pudo cerrar");
        return;
      }
      setEstado(null);
      router.refresh();
    } finally {
      setCargando(false);
    }
  }

  if (!estado) {
    return (
      <div>
        <button
          onClick={abrirChecklist}
          className="rounded-full border border-amber-400/40 px-4 py-1.5 text-sm font-semibold text-amber-300 hover:bg-amber-400/10"
        >
          Cerrar gestión
        </button>
        {error && <p className="mt-1 text-xs text-red-300">{error}</p>}
      </div>
    );
  }

  const bloquea = estado.campanasActivas > 0 && !cerrarCampanas;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-5">
        <h3 className="text-lg font-semibold">Antes de cerrar la gestión…</h3>
        <ul className="mt-4 space-y-3 text-sm">
          {estado.campanasActivas > 0 ? (
            <li className="rounded-xl bg-amber-400/10 p-3 text-amber-200">
              <span className="flex items-start gap-2">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  <b>{estado.campanasActivas} pago(s) extraordinario(s) activo(s)</b>
                  <label className="mt-1.5 flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={cerrarCampanas}
                      onChange={(e) => setCerrarCampanas(e.target.checked)}
                      className="h-4 w-4 accent-emerald-500"
                    />
                    Cerrarlas ahora al cerrar la gestión
                  </label>
                </span>
              </span>
            </li>
          ) : (
            <li className="flex items-center gap-2 text-emerald-300">
              <CircleCheck className="h-4 w-4" /> Sin pagos extraordinarios activos
            </li>
          )}

          <li
            className={`rounded-xl p-3 ${
              estado.multasImpagas > 0 ? "bg-red-500/10 text-red-200" : "bg-emerald-500/10 text-emerald-300"
            }`}
          >
            {estado.multasImpagas > 0 ? (
              <>
                <b>{estado.multasImpagas} multa(s) impaga(s)</b> por {formatBs(estado.multasTotal)} —{" "}
                <span className="text-xs">
                  quedarán vigentes en la siguiente gestión hasta que se paguen.
                </span>
              </>
            ) : (
              "Sin multas impagas"
            )}
          </li>

          <li
            className={`rounded-xl p-3 ${
              estado.expensasVencidas > 0 ? "bg-amber-400/10 text-amber-200" : "bg-emerald-500/10 text-emerald-300"
            }`}
          >
            {estado.expensasVencidas > 0 ? (
              <>
                <b>{estado.expensasVencidas} expensa(s) vencida(s) sin pagar</b> —{" "}
                <span className="text-xs">
                seguirán visibles y bloqueando el salón en la siguiente gestión.
                </span>
              </>
            ) : (
              "Sin expensas vencidas"
            )}
          </li>
        </ul>

        <label className="mt-4 block text-sm">
          Nota de cierre (opcional)
          <input
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2"
          />
        </label>

        {error && <p className="mt-2 text-sm text-red-300">{error}</p>}

        <p className="mt-3 text-xs text-amber-300/80">
          Al confirmar, la gestión queda inmutable para siempre.
        </p>
        <div className="mt-4 flex gap-2">
          <button
            onClick={cerrar}
            disabled={cargando || bloquea}
            className="flex-1 rounded-lg bg-amber-400 py-2 font-semibold text-slate-950 disabled:opacity-50"
          >
            {cargando
              ? "Cerrando…"
              : bloquea
                ? "Marca cerrar pagos extraordinarios para continuar"
                : "Confirmar cierre"}
          </button>
          <button
            onClick={() => setEstado(null)}
            className="rounded-lg border border-white/15 px-4 py-2 text-sm"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

export function CerrarCampana({ campanaId }: { campanaId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function cerrar() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`/api/campanas/${campanaId}/cerrar`, {
        method: "POST",
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? "No se pudo cerrar");
        return;
      }
      router.refresh();
    } finally {
      setCargando(false);
    }
  }

  return (
    <div>
      <button
        onClick={cerrar}
        disabled={cargando}
        className="rounded-full border border-amber-400/40 px-4 py-1.5 text-sm font-semibold text-amber-300 hover:bg-amber-400/10 disabled:opacity-50"
      >
        {cargando ? "Cerrando…" : "Cerrar pago extraordinario"}
      </button>
      {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
    </div>
  );
}
