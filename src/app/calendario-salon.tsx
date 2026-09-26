"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ReservaDia {
  id: string;
  fecha: string;
  vecino_nombre: string;
  vecino_casa: string;
  monto: number;
  descripcion: string;
  estado: string;
}

const DIAS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/** Suma meses a un "yyyy-mm" de forma segura. */
function sumarMes(mes: string, delta: number): string {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * RF-1/RF-2: grilla mensual del salón. Sin sesión la API devuelve solo fechas
 * ocupadas (modo "publico"); con sesión devuelve detalle (modo "panel").
 */
export function CalendarioSalon({
  mesInicial,
  publico = false,
  hoy,
  onFechaLibre,
}: {
  mesInicial: string;
  publico?: boolean;
  hoy: string;
  onFechaLibre?: (fecha: string) => void;
}) {
  const [mes, setMes] = useState(mesInicial);
  const [ocupadas, setOcupadas] = useState<string[]>([]);
  const [reservas, setReservas] = useState<Record<string, ReservaDia>>({});
  const [cargando, setCargando] = useState(true);

  // Cambio de mes desde los botones (handlers: aquí sí se puede setear estado)
  const cambiarMes = useCallback((delta: number) => {
    setCargando(true);
    setMes((x) => sumarMes(x, delta));
  }, []);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const res = await fetch(`/api/salon?mes=${mes}`);
        const d = await res.json();
        if (!vivo || !res.ok) return;
        if (d.ocupadas) {
          setOcupadas(d.ocupadas);
          setReservas({});
        } else {
          const map: Record<string, ReservaDia> = {};
          for (const r of d.reservas ?? []) if (r.estado === "vigente") map[r.fecha] = r;
          setReservas(map);
          setOcupadas(Object.keys(map));
        }
      } finally {
        if (vivo) setCargando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [mes]);

  // Grilla: lunes primero
  const celdas = useMemo(() => {
    const [a, m] = mes.split("-").map(Number);
    const primero = new Date(Date.UTC(a, m - 1, 1));
    const diasMes = new Date(Date.UTC(a, m, 0)).getUTCDate();
    const offset = (primero.getUTCDay() + 6) % 7;
    const celdas: ({ dia: number; fecha: string } | null)[] = Array(offset).fill(null);
    for (let d = 1; d <= diasMes; d++) {
      celdas.push({
        dia: d,
        fecha: `${a}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      });
    }
    return celdas;
  }, [mes]);

  const [a, m] = mes.split("-").map(Number);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => cambiarMes(-1)}
          aria-label="Mes anterior"
          className="rounded-full p-2 hover:bg-white/10"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <p className="text-lg font-semibold">
          {MESES[m - 1]} {a}
        </p>
        <button
          onClick={() => cambiarMes(1)}
          aria-label="Mes siguiente"
          className="rounded-full p-2 hover:bg-white/10"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs text-slate-400">
        {DIAS.map((d) => (
          <span key={d} className="py-1">{d}</span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {celdas.map((c, i) =>
          c === null ? (
            <span key={`v-${i}`} />
          ) : (
            <button
              key={c.fecha}
              disabled={cargando || ocupadas.includes(c.fecha) || c.fecha < hoy}
              onClick={() => onFechaLibre?.(c.fecha)}
              title={
                publico || !reservas[c.fecha]
                  ? undefined
                  : `${reservas[c.fecha].vecino_nombre} (${reservas[c.fecha].vecino_casa || "s/c"})${reservas[c.fecha].descripcion ? ` — ${reservas[c.fecha].descripcion}` : ""}`
              }
              className={[
                "flex aspect-square flex-col items-center justify-center rounded-lg text-sm transition",
                ocupadas.includes(c.fecha)
                  ? "bg-red-500/20 font-semibold text-red-300"
                  : c.fecha < hoy
                    ? "text-slate-600"
                    : "bg-emerald-500/10 font-medium text-emerald-200 hover:bg-emerald-500/25",
                c.fecha === hoy ? "ring-2 ring-emerald-400" : "",
              ].join(" ")}
            >
              {c.dia}
              {!publico && reservas[c.fecha] && (
                <span className="max-w-full truncate px-1 text-[10px] text-slate-300">
                  {reservas[c.fecha].vecino_nombre.split(" ")[0]}
                </span>
              )}
            </button>
          )
        )}
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-emerald-500/40" /> libre
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-red-500/40" /> reservado
        </span>
        {publico && <span>Reservas: solo con el responsable</span>}
      </div>
    </div>
  );
}
