"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus } from "lucide-react";

const MESES = [
  { n: "01", nombre: "Enero" },
  { n: "02", nombre: "Febrero" },
  { n: "03", nombre: "Marzo" },
  { n: "04", nombre: "Abril" },
  { n: "05", nombre: "Mayo" },
  { n: "06", nombre: "Junio" },
  { n: "07", nombre: "Julio" },
  { n: "08", nombre: "Agosto" },
  { n: "09", nombre: "Septiembre" },
  { n: "10", nombre: "Octubre" },
  { n: "11", nombre: "Noviembre" },
  { n: "12", nombre: "Diciembre" },
];

function aniosDisponibles(): number[] {
  const actual = new Date().getFullYear();
  return [actual, actual + 1];
}

/**
 * Spec-013: panel de administración de expensas (solo responsable) en su pestaña.
 * Mes/año por listas desplegables (sin <input type="month">, que Firefox no soporta).
 */
export function ConfigExpensas({
  periodos,
}: {
  periodos: { mes: string; monto: number; fecha_limite: string | null }[];
}) {
  const router = useRouter();
  const [mesN, setMesN] = useState("");
  const [anio, setAnio] = useState(String(aniosDisponibles()[0]));
  const [limite, setLimite] = useState("");
  const [monto, setMonto] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const mesCompleto = mesN && anio ? `${anio}-${mesN}` : "";

  // Al elegir un mes ya definido, precargar sus valores actuales
  function alElegirMes(n: string) {
    setMesN(n);
    setError(null);
    setMsg(null);
    const existente = periodos.find((p) => p.mes === `${anio}-${n}`);
    if (existente) {
      setMonto(String(existente.monto));
      setLimite(existente.fecha_limite ?? "");
    }
  }

  async function publicar() {
    setError(null);
    setMsg(null);
    setEnviando(true);
    try {
      const res = await fetch("/api/expensas/periodos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mes: mesCompleto,
          monto: Number(monto),
          confirmar: false,
          fecha_limite: limite || null,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? "No se pudo publicar el mes");
        return;
      }
      const nombreMes = MESES.find((m) => m.n === mesN)?.nombre ?? mesN;
      setMsg(
        `Mes publicado: ${nombreMes} ${anio} — ${monto} Bs por casa. Ya aparece en la grilla y los vecinos pueden pagarlo.`
      );
      router.refresh();
    } finally {
      setEnviando(false);
    }
  }

  const mesYaDefinido = periodos.some((p) => p.mes === mesCompleto);

  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
      <h3 className="flex items-center gap-2 font-semibold">
        <CalendarPlus className="h-5 w-5 text-emerald-400" />
        Administración de expensas
      </h3>
      <p className="mt-1 text-sm text-slate-400">
        Publicá el mes de cobro para que los vecinos puedan pagarlo.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {/* Paso 1: mes y año */}
        <div>
          <p className="text-sm font-semibold text-slate-200">① Mes a cobrar</p>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <select
              value={mesN}
              onChange={(e) => alElegirMes(e.target.value)}
              className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm"
            >
              <option value="">Mes…</option>
              {MESES.map((m) => (
                <option key={m.n} value={m.n}>
                  {m.nombre}
                </option>
              ))}
            </select>
            <select
              value={anio}
              onChange={(e) => {
                setAnio(e.target.value);
                setMsg(null);
              }}
              className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm"
            >
              {aniosDisponibles().map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Paso 2: monto */}
        <div>
          <p className="text-sm font-semibold text-slate-200">② Monto por casa (Bs)</p>
          <input
            value={monto}
            onChange={(e) => {
              setMonto(e.target.value);
              setError(null);
            }}
            inputMode="decimal"
            placeholder="Ej. 150"
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm"
          />
        </div>

        {/* Paso 3: fecha límite */}
        <div>
          <p className="text-sm font-semibold text-slate-200">
            ③ Fecha límite de pago <span className="font-normal text-slate-500">(opcional)</span>
          </p>
          <input
            value={limite}
            onChange={(e) => setLimite(e.target.value)}
            type="date"
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-slate-500">
            Pasada esa fecha sin pagar, el mes queda “vencido” y bloquea el salón.
          </p>
        </div>

        {/* Ejemplo + acción */}
        <div className="flex flex-col justify-end">
          <p className="text-xs text-slate-500">
            Ej.: noviembre 2026 · 150 Bs · pagar hasta el 10 de diciembre
          </p>
          <button
            onClick={publicar}
            disabled={enviando || !mesN || !monto}
            className="mt-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
          >
            {enviando
              ? "Publicando…"
              : mesYaDefinido
                ? "Guardar cambios del mes"
                : "Publicar mes para cobro"}
          </button>
        </div>
      </div>

      {mesYaDefinido && (
        <p className="mt-3 text-xs text-amber-300">
          Ese mes ya está publicado; si cambias el monto, los pagos ya realizados
          no se recalculan.
        </p>
      )}
      {error && <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
      {msg && <p className="mt-3 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{msg}</p>}
    </div>
  );
}
