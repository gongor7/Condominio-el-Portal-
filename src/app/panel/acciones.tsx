"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CerrarGestion({ gestionId }: { gestionId: string }) {
  const router = useRouter();
  const [nota, setNota] = useState("");
  const [confirmar, setConfirmar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function cerrar() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`/api/gestiones/${gestionId}/cerrar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nota }),
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

  if (!confirmar) {
    return (
      <button
        onClick={() => setConfirmar(true)}
        className="rounded-full border border-amber-400/40 px-4 py-1.5 text-sm font-semibold text-amber-300 hover:bg-amber-400/10"
      >
        Cerrar gestión
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-xl border border-amber-400/30 bg-amber-400/5 p-4">
      <p className="text-sm text-amber-200">
        Al cerrar, la gestión queda inmutable para siempre. Asegúrate de haber
        registrado todo.
      </p>
      <input
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        placeholder="Nota de cierre (opcional)"
        className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm"
      />
      {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          onClick={cerrar}
          disabled={cargando}
          className="rounded-lg bg-amber-400 px-4 py-1.5 text-sm font-semibold text-slate-950 disabled:opacity-50"
        >
          {cargando ? "Cerrando…" : "Confirmar cierre"}
        </button>
        <button
          onClick={() => setConfirmar(false)}
          className="rounded-lg border border-white/10 px-4 py-1.5 text-sm"
        >
          Cancelar
        </button>
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
        {cargando ? "Cerrando…" : "Cerrar campaña"}
      </button>
      {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
    </div>
  );
}
