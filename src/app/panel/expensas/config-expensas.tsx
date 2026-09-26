"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Settings2, Home } from "lucide-react";

/** RF-3/RF-4: configuración del responsable dentro de la pestaña Expensas. */
export function ConfigExpensas({
  casas,
}: {
  casas: { id: string; numero: number; vecino_nombre: string }[];
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [mes, setMes] = useState("");
  const [monto, setMonto] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [nuevoNum, setNuevoNum] = useState("");
  const [nuevoNombre, setNuevoNombre] = useState("");

  async function definirPeriodo() {
    setMsg(null);
    const res = await fetch("/api/expensas/periodos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mes, monto: Number(monto), confirmar: false }),
    });
    const d = await res.json();
    if (!res.ok) {
      setMsg(d.error ?? "No se pudo definir");
      return;
    }
    setMsg(`Período ${mes} definido: ${monto} Bs`);
    router.refresh();
  }

  async function agregarCasa() {
    setMsg(null);
    const res = await fetch("/api/expensas/casas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ numero: Number(nuevoNum), vecino_nombre: nuevoNombre }),
    });
    const d = await res.json();
    if (!res.ok) {
      setMsg(d.error ?? "No se pudo agregar");
      return;
    }
    setMsg(`Casa ${nuevoNum} agregada`);
    setNuevoNum("");
    setNuevoNombre("");
    router.refresh();
  }

  return (
    <div className="mt-6">
      <button
        onClick={() => setAbierto((a) => !a)}
        className="flex items-center gap-2 rounded-full border border-white/15 px-4 py-1.5 text-sm font-semibold hover:bg-white/10"
      >
        <Settings2 className="h-4 w-4" /> Configuración (responsable)
      </button>

      {abierto && (
        <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-5">
          {/* Definir monto del mes */}
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Definir monto del mes
          </h3>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <input
              type="month"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm"
            />
            <input
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="Monto Bs"
              inputMode="decimal"
              className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm"
            />
            <button
              onClick={definirPeriodo}
              disabled={!mes || !monto}
              className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
            >
              Definir
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Cambiar el monto de un mes con pagos ya registrados no recalcula lo pagado.
          </p>

          {/* Casas */}
          <h3 className="mt-6 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
            <Home className="h-4 w-4" /> Casas ({casas.length})
          </h3>
          <div className="mt-2 max-h-48 space-y-1 overflow-y-auto pr-1 text-sm">
            {casas.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-lg border border-white/5 bg-slate-900/60 px-3 py-1.5"
              >
                <span>
                  <b>Casa {c.numero}</b>
                  <span className="ml-2 text-slate-400">{c.vecino_nombre}</span>
                </span>
                <button
                  onClick={async () => {
                    const nombre = prompt(`Nuevo nombre para Casa ${c.numero}:`, c.vecino_nombre);
                    if (!nombre) return;
                    await fetch(`/api/expensas/casas`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ id: c.id, vecino_nombre: nombre }),
                    });
                    router.refresh();
                  }}
                  className="text-xs text-emerald-300 hover:underline"
                >
                  renombrar
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-[80px_1fr_auto] gap-2">
            <input
              value={nuevoNum}
              onChange={(e) => setNuevoNum(e.target.value)}
              placeholder="Nº"
              inputMode="numeric"
              className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm"
            />
            <input
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              placeholder="Nombre del vecino"
              className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm"
            />
            <button
              onClick={agregarCasa}
              disabled={!nuevoNum || !nuevoNombre}
              className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
            >
              Agregar
            </button>
          </div>

          {msg && <p className="mt-3 text-sm text-amber-300">{msg}</p>}
        </div>
      )}
    </div>
  );
}
