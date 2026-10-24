"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, RefreshCw, Clock } from "lucide-react";

interface Snapshot {
  nombre: string;
  tamano_kb: number;
  creado: string;
}

/** Spec-010: descarga bajo demanda + snapshots automáticos (cron diario). */
export function ReportesCliente({ esResponsable }: { esResponsable: boolean }) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [cargando, setCargando] = useState(esResponsable);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(
    (aplicar: (r: Snapshot[] | null) => void) => {
      fetch("/api/reporte-excel/snapshots")
        .then(async (res) => {
          const d = await res.json();
          if (!res.ok) throw new Error(d.error ?? "No se pudo cargar la lista");
          aplicar((d.snapshots ?? []) as Snapshot[]);
        })
        .catch((e) => {
          setError(String(e instanceof Error ? e.message : e));
          aplicar(null);
        });
    },
    []
  );

  useEffect(() => {
    if (!esResponsable) return;
    let vivo = true;
    // carga inicial: los setState ocurren en el callback asíncrono, no en el cuerpo
    (async () => {
      try {
        const res = await fetch("/api/reporte-excel/snapshots");
        const d = await res.json();
        if (!vivo) return;
        if (!res.ok) throw new Error(d.error ?? "No se pudo cargar la lista");
        setSnapshots((d.snapshots ?? []) as Snapshot[]);
      } catch (e) {
        if (vivo) setError(String(e instanceof Error ? e.message : e));
      } finally {
        if (vivo) setCargando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [esResponsable]);

  async function generar() {
    setGenerando(true);
    setError(null);
    try {
      const res = await fetch("/api/reporte-excel/snapshots", { method: "POST" });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? "No se pudo generar");
        return;
      }
      cargar((r) => {
        if (r) setSnapshots(r);
      });
    } finally {
      setGenerando(false);
    }
  }

  if (!esResponsable) {
    return (
      <p className="mt-6 rounded-xl bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
        Los reportes los genera y descarga el responsable de la gestión.
      </p>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {/* Descarga inmediata */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="font-semibold">Descargar ahora</h2>
        <p className="mt-1 text-sm text-slate-300">
          Genera el reporte con los datos de este instante y lo descarga.
        </p>
        <a
          href="/api/reporte-excel"
          className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
        >
          <Download className="h-4 w-4" /> Descargar reporte Excel
        </a>
      </div>

      {/* Automático */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="flex items-center gap-2 font-semibold">
          <Clock className="h-4 w-4 text-emerald-400" /> Copia automática diaria
        </h2>
        <p className="mt-1 text-sm text-slate-300">
          Todos los días a las <b>6:00 AM</b> (Bolivia) el sistema guarda
          automáticamente una copia aquí, para que siempre tengas un respaldo
          fechado aunque no entres a la plataforma.
        </p>
        <button
          onClick={generar}
          disabled={generando}
          className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/10 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${generando ? "animate-spin" : ""}`} />
          {generando ? "Generando…" : "Generar copia ahora"}
        </button>

        {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

        <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Copias guardadas
        </h3>
        {cargando ? (
          <p className="mt-2 text-sm text-slate-400">Cargando…</p>
        ) : snapshots.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">
            Aún no hay copias automáticas; la primera se genera mañana a las 6:00 AM
            (o pulsa «Generar copia ahora»).
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-white/5 rounded-xl border border-white/10">
            {snapshots.map((s) => (
              <li
                key={s.nombre}
                className="flex items-center justify-between px-4 py-2.5 text-sm"
              >
                <span>
                  <b>{s.nombre}</b>
                  <span className="ml-2 text-xs text-slate-400">
                    {s.tamano_kb} KB · {new Date(s.creado).toLocaleString("es-BO")}
                  </span>
                </span>
                <button
                  onClick={async () => {
                    const res = await fetch("/api/reporte-excel/snapshots", {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ nombre: s.nombre }),
                    });
                    if (!res.ok) {
                      const d = await res.json();
                      window.alert(d.error ?? "No se pudo descargar");
                      return;
                    }
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = s.nombre;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25"
                >
                  <Download className="h-3.5 w-3.5" /> Descargar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
