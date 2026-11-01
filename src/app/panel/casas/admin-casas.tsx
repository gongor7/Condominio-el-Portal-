"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Home } from "lucide-react";

/** Spec-013: administración de casas (agregar/renombrar) en la pestaña Casas. */
export function AdminCasas({
  casas,
}: {
  casas: { id: string; numero: number; vecino_nombre: string }[];
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [nuevoNum, setNuevoNum] = useState("");
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

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
        <Home className="h-4 w-4" /> Administrar casas ({casas.length})
      </button>

      {abierto && (
        <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="max-h-48 space-y-1 overflow-y-auto pr-1 text-sm">
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
                    const nombre = prompt(
                      `Nuevo nombre para Casa ${c.numero}:`,
                      c.vecino_nombre
                    );
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
