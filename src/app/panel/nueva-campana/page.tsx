"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NuevaCampana() {
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [meta, setMeta] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      const res = await fetch("/api/campanas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo, descripcion, meta: meta === "" ? null : Number(meta) }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? "No se pudo crear");
        return;
      }
      router.push(`/panel/campanas/${d.campana.id}`);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <form
        onSubmit={guardar}
        className="mx-auto max-w-lg rounded-2xl border border-white/10 bg-white/5 p-6"
      >
        <a href="/panel" className="text-sm text-emerald-300 hover:underline">
          ← Volver
        </a>
        <h1 className="mt-2 text-xl font-bold">Nueva campaña de recaudación</h1>

        <label className="mt-4 block text-sm">
          Título
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            required
            placeholder="Ej. Reparación de la bomba de agua"
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2"
          />
        </label>
        <label className="mt-3 block text-sm">
          Descripción
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2"
          />
        </label>
        <label className="mt-3 block text-sm">
          Meta en Bs (vacío = recaudación abierta)
          <input
            value={meta}
            onChange={(e) => setMeta(e.target.value)}
            inputMode="decimal"
            placeholder="Ej. 1500"
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2"
          />
        </label>

        {error && (
          <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={guardando}
          className="mt-6 w-full rounded-lg bg-emerald-500 py-2.5 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
        >
          {guardando ? "Creando…" : "Crear campaña"}
        </button>
      </form>
    </main>
  );
}
