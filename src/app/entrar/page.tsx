"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Entrar() {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");
  const [pin, setPin] = useState("");
  const [esResponsable, setEsResponsable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const res = await fetch("/api/acceso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo, pin: esResponsable ? pin : undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo ingresar");
        return;
      }
      router.push("/panel");
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <form
        onSubmit={enviar}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-8 text-white backdrop-blur"
      >
        <h1 className="text-2xl font-bold">Entrar</h1>
        <p className="mt-1 text-sm text-slate-300">
          Usa el código del condominio que compartió el responsable.
        </p>

        <label className="mt-6 block text-sm font-medium">
          Código del condominio
          <input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.trim())}
            required
            placeholder="Ej. PORTAL2025"
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
          />
        </label>

        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={esResponsable}
            onChange={(e) => setEsResponsable(e.target.checked)}
            className="h-4 w-4 accent-emerald-500"
          />
          Soy el responsable de la gestión
        </label>

        {esResponsable && (
          <label className="mt-3 block text-sm font-medium">
            PIN del responsable
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value.trim())}
              required
              inputMode="numeric"
              className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 tracking-widest focus:border-emerald-400 focus:outline-none"
            />
          </label>
        )}

        {error && (
          <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={cargando}
          className="mt-6 w-full rounded-lg bg-emerald-500 py-2.5 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
        >
          {cargando ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
    </main>
  );
}
