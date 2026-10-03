"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const CATEGORIAS = [
  "mantenimiento",
  "limpieza",
  "seguridad",
  "servicios básicos",
  "reparación",
  "recaudación",
  "alquiler salón",
  "otros",
];

export default function Registrar() {
  const router = useRouter();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [tipo, setTipo] = useState<"ingreso" | "egreso">("egreso");
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [categoria, setCategoria] = useState("otros");
  const [descripcion, setDescripcion] = useState("");
  const [campanaId, setCampanaId] = useState("");
  const [campanas, setCampanas] = useState<{ id: string; titulo: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Cargar campañas activas para asociar gastos
  useEffect(() => {
    fetch("/api/campanas")
      .then((r) => r.json())
      .then((d) => setCampanas(d.campanas ?? []))
      .catch(() => {});
  }, []);

  function alElegirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    setArchivo(e.target.files?.[0] ?? null);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      let comprobanteUrl: string | null = null;
      if (archivo) {
        const fd = new FormData();
        fd.append("archivo", archivo);
        const up = await fetch("/api/subir-archivo", { method: "POST", body: fd });
        const upd = await up.json();
        if (!up.ok) {
          setError(upd.error ?? "No se pudo subir el comprobante");
          return;
        }
        comprobanteUrl = upd.url;
      }
      const res = await fetch("/api/transacciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo,
          monto: Number(monto),
          fecha,
          categoria,
          descripcion,
          comprobante_url: comprobanteUrl,
          campana_id: campanaId || null,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? "No se pudo registrar");
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
        onSubmit={guardar}
        className="mx-auto max-w-lg rounded-2xl border border-white/10 bg-white/5 p-6"
      >
        <h1 className="text-xl font-bold">Registrar movimiento</h1>
        <p className="mt-1 text-sm text-slate-300">
          Adjunta el comprobante del movimiento (foto o PDF).
        </p>

        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={alElegirArchivo}
          className="mt-4 w-full rounded-lg border border-dashed border-white/20 bg-slate-900 p-3 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-emerald-500 file:px-3 file:py-1.5 file:font-semibold file:text-slate-950"
        />

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="text-sm">
            Tipo
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as "ingreso" | "egreso")}
              className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2"
            >
              <option value="ingreso">Ingreso</option>
              <option value="egreso">Egreso</option>
            </select>
          </label>
          <label className="text-sm">
            Monto (Bs)
            <input
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              required
              inputMode="decimal"
              className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Fecha
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Categoría
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2"
            >
              {CATEGORIAS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="mt-3 block text-sm">
          Descripción
          <input
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Ej. pago de agua mes de septiembre"
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2"
          />
        </label>

        {tipo === "egreso" && campanas.length > 0 && (
          <label className="mt-3 block text-sm">
            ¿Corresponde a una campaña? (opcional)
            <select
              value={campanaId}
              onChange={(e) => setCampanaId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2"
            >
              <option value="">No</option>
              {campanas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.titulo}
                </option>
              ))}
            </select>
          </label>
        )}

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
          {guardando ? "Guardando…" : "Publicar movimiento"}
        </button>
      </form>
    </main>
  );
}
