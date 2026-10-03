"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { History, Pencil, Ban } from "lucide-react";
import {
  formatBs,
  filtrarPorMes,
  mesesConMovimientos,
  resumenMes,
} from "@/lib/contabilidad";

export interface MovimientoLibro {
  id: string;
  tipo: "ingreso" | "egreso";
  monto: number | string;
  fecha: string;
  categoria: string;
  descripcion: string;
  comprobante_url: string | null;
  anulado?: boolean;
  anulado_motivo?: string | null;
}

/** Origen del movimiento creado por otro módulo (RF-9: no editable en el libro). */
const ORIGEN: Record<string, string> = {
  expensas: "Expensa",
  multas: "Multa",
  "alquiler salón": "Salón",
};

const CATEGORIAS_EDITABLES = [
  "mantenimiento",
  "limpieza",
  "seguridad",
  "servicios básicos",
  "reparación",
  "recaudación",
  "otros",
];

const MESES_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function etiquetaMes(mes: string): string {
  const [y, m] = mes.split("-").map(Number);
  return `${MESES_ES[(m ?? 1) - 1] ?? mes} ${y}`;
}

const ETIQUETA_CAMPO: Record<string, string> = {
  monto: "Monto",
  fecha: "Fecha",
  categoria: "Categoría",
  descripcion: "Descripción",
  comprobante_url: "Comprobante",
};

interface Edicion {
  campo: string;
  anterior: string | null;
  nuevo: string | null;
  autor: string;
  motivo: string | null;
  creado_en: string;
}

export function Libro({
  movimientos,
  saldoInicial,
  esResponsable,
}: {
  movimientos: MovimientoLibro[];
  saldoInicial: number;
  esResponsable: boolean;
}) {
  const router = useRouter();
  const [mes, setMes] = useState<string>("todo");
  const [editando, setEditando] = useState<MovimientoLibro | null>(null);
  const [anulando, setAnulando] = useState<MovimientoLibro | null>(null);
  const [historialDe, setHistorialDe] = useState<MovimientoLibro | null>(null);

  const normalizados = useMemo(
    () => movimientos.map((t) => ({ ...t, monto: Number(t.monto) })),
    [movimientos]
  );
  const meses = useMemo(() => mesesConMovimientos(normalizados), [normalizados]);
  const filas = useMemo(
    () => filtrarPorMes(normalizados, mes),
    [normalizados, mes]
  );
  const resumen = mes === "todo" ? null : resumenMes(normalizados, mes, saldoInicial);

  return (
    <div>
      {/* Filtro por mes (RF-6) */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label className="text-sm text-slate-300">Ver:</label>
        <select
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          className="rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-sm"
        >
          <option value="todo">Todo</option>
          {meses.map((m) => (
            <option key={m} value={m}>
              {etiquetaMes(m)}
            </option>
          ))}
        </select>
      </div>

      {/* Tarjeta del mes (RF-6/RF-7) */}
      {resumen && (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase text-slate-400">Comenzó con</p>
            <p className="mt-1 text-lg font-bold">{formatBs(resumen.inicio)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase text-slate-400">Ingresos del mes</p>
            <p className="mt-1 text-lg font-bold text-emerald-400">
              {formatBs(resumen.ingresos)}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase text-slate-400">Egresos del mes</p>
            <p className="mt-1 text-lg font-bold text-red-400">
              {formatBs(resumen.egresos)}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase text-slate-400">Saldo fin de mes</p>
            <p className="mt-1 text-lg font-bold">{formatBs(resumen.fin)}</p>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-white/5 text-left text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Descripción</th>
              <th className="px-4 py-3">Categoría</th>
              <th className="px-4 py-3 text-right">Ingreso</th>
              <th className="px-4 py-3 text-right">Egreso</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  Sin movimientos{mes !== "todo" ? " este mes" : " aún"}.
                </td>
              </tr>
            )}
            {filas.map((t) => {
              const origen = ORIGEN[t.categoria];
              const editable = esResponsable && !t.anulado && !origen;
              return (
                <tr
                  key={t.id}
                  className={`border-t border-white/5 ${t.anulado ? "opacity-40 line-through" : ""}`}
                >
                  <td className="px-4 py-3 whitespace-nowrap">{t.fecha}</td>
                  <td className="px-4 py-3">
                    {t.descripcion}
                    {t.comprobante_url && (
                      <a
                        href={t.comprobante_url}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-2 text-xs text-emerald-300 underline"
                      >
                        comprobante
                      </a>
                    )}
                    {t.anulado && t.anulado_motivo && (
                      <span className="ml-2 text-xs text-slate-500">
                        (anulado: {t.anulado_motivo})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {t.categoria}
                    {origen && (
                      <span className="ml-2 rounded-full bg-sky-500/15 px-2 py-0.5 text-xs text-sky-300">
                        {origen}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-400">
                    {t.tipo === "ingreso" && !t.anulado ? formatBs(Number(t.monto)) : ""}
                  </td>
                  <td className="px-4 py-3 text-right text-red-400">
                    {t.tipo === "egreso" && !t.anulado ? formatBs(Number(t.monto)) : ""}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => setHistorialDe(t)}
                      title="Ver historial de cambios"
                      className="mr-2 text-xs text-slate-400 hover:text-white hover:underline"
                    >
                      <History className="inline h-3.5 w-3.5" /> historial
                    </button>
                    {editable && (
                      <>
                        <button
                          onClick={() => setEditando(t)}
                          title="Editar movimiento"
                          className="mr-2 text-xs text-emerald-300 hover:underline"
                        >
                          <Pencil className="inline h-3.5 w-3.5" /> editar
                        </button>
                        <button
                          onClick={() => setAnulando(t)}
                          title="Anular movimiento"
                          className="text-xs text-red-300 hover:underline"
                        >
                          <Ban className="inline h-3.5 w-3.5" /> anular
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editando && (
        <ModalEditar
          movimiento={editando}
          onCerrar={() => setEditando(null)}
          onHecho={() => {
            setEditando(null);
            router.refresh();
          }}
        />
      )}
      {anulando && (
        <ModalAnular
          movimiento={anulando}
          onCerrar={() => setAnulando(null)}
          onHecho={() => {
            setAnulando(null);
            router.refresh();
          }}
        />
      )}
      {historialDe && (
        <ModalHistorial
          movimiento={historialDe}
          onCerrar={() => setHistorialDe(null)}
        />
      )}
    </div>
  );
}

function ModalEditar({
  movimiento,
  onCerrar,
  onHecho,
}: {
  movimiento: MovimientoLibro;
  onCerrar: () => void;
  onHecho: () => void;
}) {
  const [monto, setMonto] = useState(String(movimiento.monto));
  const [fecha, setFecha] = useState(movimiento.fecha);
  const [categoria, setCategoria] = useState(movimiento.categoria);
  const [descripcion, setDescripcion] = useState(movimiento.descripcion);
  const [motivo, setMotivo] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    setError(null);
    setGuardando(true);
    try {
      let comprobanteUrl: string | undefined;
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
      const res = await fetch(`/api/transacciones/${movimiento.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monto: Number(monto),
          fecha,
          categoria,
          descripcion,
          ...(comprobanteUrl ? { comprobante_url: comprobanteUrl } : {}),
          motivo,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? "No se pudo editar");
        return;
      }
      onHecho();
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-5">
        <h3 className="text-lg font-semibold">
          Editar {movimiento.tipo} del {movimiento.fecha}
        </h3>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="text-sm">
            Monto (Bs)
            <input
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              inputMode="decimal"
              className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Fecha
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2"
            />
          </label>
        </div>
        <label className="mt-3 block text-sm">
          Categoría
          <select
            value={CATEGORIAS_EDITABLES.includes(categoria) ? categoria : "otros"}
            onChange={(e) => setCategoria(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2"
          >
            {CATEGORIAS_EDITABLES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="mt-3 block text-sm">
          Descripción
          <input
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2"
          />
        </label>
        <label className="mt-3 block text-sm">
          Reemplazar comprobante (opcional)
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
            className="mt-1 w-full rounded-lg border border-dashed border-white/20 bg-slate-950 p-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-emerald-500 file:px-3 file:py-1 file:text-slate-950"
          />
        </label>
        <label className="mt-3 block text-sm">
          Motivo de la edición (obligatorio)
          <input
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej. monto mal copiado del comprobante"
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2"
          />
        </label>
        {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
        <div className="mt-4 flex gap-2">
          <button
            onClick={guardar}
            disabled={guardando || !motivo.trim()}
            className="flex-1 rounded-lg bg-emerald-500 py-2 font-semibold text-slate-950 disabled:opacity-50"
          >
            {guardando ? "Guardando…" : "Guardar cambios"}
          </button>
          <button
            onClick={onCerrar}
            className="rounded-lg border border-white/15 px-4 py-2 text-sm"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalAnular({
  movimiento,
  onCerrar,
  onHecho,
}: {
  movimiento: MovimientoLibro;
  onCerrar: () => void;
  onHecho: () => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function anular() {
    setError(null);
    setEnviando(true);
    try {
      const res = await fetch(`/api/transacciones/${movimiento.id}/anular`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? "No se pudo anular");
        return;
      }
      onHecho();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-5">
        <h3 className="text-lg font-semibold">Anular movimiento</h3>
        <p className="mt-1 text-sm text-slate-300">
          {movimiento.descripcion || "(sin descripción)"} ·{" "}
          {formatBs(Number(movimiento.monto))} · quedará tachado y visible.
        </p>
        <label className="mt-4 block text-sm">
          Motivo (obligatorio)
          <input
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2"
          />
        </label>
        {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
        <div className="mt-4 flex gap-2">
          <button
            onClick={anular}
            disabled={enviando || !motivo.trim()}
            className="flex-1 rounded-lg bg-red-500 py-2 font-semibold text-white disabled:opacity-50"
          >
            {enviando ? "Anulando…" : "Confirmar anulación"}
          </button>
          <button
            onClick={onCerrar}
            className="rounded-lg border border-white/15 px-4 py-2 text-sm"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalHistorial({
  movimiento,
  onCerrar,
}: {
  movimiento: MovimientoLibro;
  onCerrar: () => void;
}) {
  const [ediciones, setEdiciones] = useState<Edicion[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/transacciones/${movimiento.id}/ediciones`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) setError(d.error ?? "No se pudo leer");
        else setEdiciones(d.ediciones ?? []);
      })
      .catch(() => setError("Error de conexión"));
  }, [movimiento.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-5">
        <h3 className="text-lg font-semibold">Historial de cambios</h3>
        <p className="mt-1 text-sm text-slate-300">
          {movimiento.descripcion || "(sin descripción)"}
        </p>
        <div className="mt-4 max-h-64 space-y-2 overflow-y-auto text-sm">
          {error && <p className="text-red-300">{error}</p>}
          {ediciones && ediciones.length === 0 && (
            <p className="text-slate-400">Sin ediciones registradas.</p>
          )}
          {ediciones?.map((e, i) => (
            <div key={i} className="rounded-xl bg-white/5 p-3">
              <p>
                <b>{ETIQUETA_CAMPO[e.campo] ?? e.campo}:</b>{" "}
                <span className="text-red-300 line-through">{e.anterior ?? "—"}</span>{" "}
                → <span className="text-emerald-300">{e.nuevo ?? "—"}</span>
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {e.motivo ?? ""} · {e.autor} ·{" "}
                {new Date(e.creado_en).toLocaleString("es-BO")}
              </p>
            </div>
          ))}
        </div>
        <button
          onClick={onCerrar}
          className="mt-4 w-full rounded-lg border border-white/15 py-2 text-sm"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
