"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SelectorCasas, useCasas, type CasaOpcion } from "@/app/selector-casas";

export default function NuevaGestion() {
  const router = useRouter();
  const casas = useCasas();
  const [nombre, setNombre] = useState("");
  const [casa, setCasa] = useState<CasaOpcion | null>(null);
  const [fechaInicio, setFechaInicio] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [saldoInicial, setSaldoInicial] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      const res = await fetch("/api/gestiones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          casa_id: casa?.id ?? null,
          fecha_inicio: fechaInicio,
          saldo_inicial: saldoInicial === "" ? 0 : Number(saldoInicial),
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? "No se pudo crear la gestión");
        return;
      }
      router.push("/panel");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <form
        onSubmit={crear}
        className="mx-auto max-w-lg rounded-2xl border border-white/10 bg-white/5 p-6"
      >
        <a href="/panel" className="text-sm text-emerald-300 hover:underline">
          ← Volver al panel
        </a>
        <h1 className="mt-2 text-xl font-bold">Nueva gestión</h1>
        <p className="mt-1 text-sm text-slate-300">
          Define el período y quién será el nuevo responsable del dinero.
        </p>

        <label className="mt-4 block text-sm">
          Nombre de la gestión
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            placeholder="Ej. Gestión 2026-2027"
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2"
          />
        </label>

        <div className="mt-3">
          <SelectorCasas
            casas={casas}
            value={casa?.id ?? ""}
            onChange={setCasa}
            etiqueta="Responsable de la nueva gestión"
          />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="text-sm">
            Fecha de inicio
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Saldo inicial (Bs, opcional)
            <input
              value={saldoInicial}
              onChange={(e) => setSaldoInicial(e.target.value)}
              inputMode="decimal"
              placeholder="0"
              className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2"
            />
          </label>
        </div>

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
          {guardando ? "Creando…" : "Crear gestión"}
        </button>
      </form>
    </main>
  );
}
