"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Ban } from "lucide-react";
import { formatBs } from "@/lib/contabilidad";

interface ReservaLista {
  id: string;
  fecha: string;
  vecino_nombre: string;
  vecino_casa: string;
  monto: number;
  descripcion: string;
  estado: string;
}

export function ListaReservas({
  reservas,
  esResponsable,
}: {
  reservas: ReservaLista[];
  esResponsable: boolean;
}) {
  const router = useRouter();
  const [anulando, setAnulando] = useState<ReservaLista | null>(null);
  const [editando, setEditando] = useState<ReservaLista | null>(null);

  if (reservas.length === 0) {
    return (
      <p className="mt-6 text-sm text-slate-400">
        Sin reservas este mes.
      </p>
    );
  }

  const vigentes = reservas.filter((r) => r.estado === "vigente");
  const anuladas = reservas.filter((r) => r.estado === "anulada");

  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold">Reservas del mes</h2>
      <ul className="mt-3 divide-y divide-white/5 rounded-2xl border border-white/10">
        {vigentes.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-2 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate font-medium">
                {r.vecino_nombre}
                <span className="ml-1 text-xs text-slate-400">
                  {r.vecino_casa || "s/c"}
                </span>
              </p>
              <p className="text-xs text-slate-400">
                {r.fecha}
                {r.descripcion && ` — ${r.descripcion}`}
                {Number(r.monto) === 0 && " · gratuita"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {Number(r.monto) > 0 && (
                <b className="text-emerald-400">{formatBs(Number(r.monto))}</b>
              )}
              {esResponsable && (
                <>
                  <button
                    aria-label="Editar"
                    onClick={() => setEditando(r)}
                    className="rounded-full p-1.5 hover:bg-white/10"
                  >
                    <Pencil className="h-4 w-4 text-slate-300" />
                  </button>
                  <button
                    aria-label="Anular"
                    onClick={() => setAnulando(r)}
                    className="rounded-full p-1.5 hover:bg-red-500/20"
                  >
                    <Ban className="h-4 w-4 text-red-400" />
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>

      {anuladas.length > 0 && (
        <>
          <h3 className="mt-5 text-sm font-semibold text-slate-400">
            Anuladas (referencia)
          </h3>
          <ul className="mt-2 divide-y divide-white/5 rounded-2xl border border-white/10">
            {anuladas.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between px-4 py-2.5 text-sm opacity-50"
              >
                <span className="line-clamp-1 line-through">
                  {r.fecha} · {r.vecino_nombre}
                </span>
                <span className="text-xs">anulada</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {anulando && (
        <ModalAnular
          reserva={anulando}
          onCerrar={() => setAnulando(null)}
          onHecho={() => {
            setAnulando(null);
            router.refresh();
          }}
        />
      )}
      {editando && (
        <ModalEditar
          reserva={editando}
          onCerrar={() => setEditando(null)}
          onHecho={() => {
            setEditando(null);
            router.refresh();
          }}
        />
      )}
    </section>
  );
}

function ModalAnular({
  reserva,
  onCerrar,
  onHecho,
}: {
  reserva: ReservaLista;
  onCerrar: () => void;
  onHecho: () => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [tipo, setTipo] = useState<"devolucion" | "retencion">("devolucion");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function anular() {
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch(`/api/salon/${reserva.id}/anular`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo, tipo }),
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
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-5">
        <h3 className="font-semibold">
          Anular reserva del {reserva.fecha}
        </h3>
        <p className="mt-1 text-sm text-slate-300">
          {reserva.vecino_nombre} · {formatBs(Number(reserva.monto))}
        </p>
        <label className="mt-4 block text-sm">
          Motivo (obligatorio)
          <input
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2"
          />
        </label>
        <fieldset className="mt-3 text-sm">
          <legend>¿Qué pasa con el dinero?</legend>
          <label className="mt-1 flex items-center gap-2">
            <input
              type="radio"
              name="tipo"
              checked={tipo === "devolucion"}
              onChange={() => setTipo("devolucion")}
              className="accent-emerald-500"
            />
            Se devuelve (anula el ingreso contable)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="tipo"
              checked={tipo === "retencion"}
              onChange={() => setTipo("retencion")}
              className="accent-emerald-500"
            />
            Se retiene (el ingreso queda registrado)
          </label>
        </fieldset>
        {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
        <div className="mt-4 flex gap-2">
          <button
            onClick={anular}
            disabled={enviando || !motivo.trim()}
            className="flex-1 rounded-lg bg-red-500 py-2 font-semibold text-white disabled:opacity-50"
          >
            {enviando ? "Anulando…" : "Anular reserva"}
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

function ModalEditar({
  reserva,
  onCerrar,
  onHecho,
}: {
  reserva: ReservaLista;
  onCerrar: () => void;
  onHecho: () => void;
}) {
  const [nombre, setNombre] = useState(reserva.vecino_nombre);
  const [casa, setCasa] = useState(reserva.vecino_casa ?? "");
  const [descripcion, setDescripcion] = useState(reserva.descripcion ?? "");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function guardar() {
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch(`/api/salon/${reserva.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vecino_nombre: nombre, vecino_casa: casa, descripcion }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? "No se pudo editar");
        return;
      }
      onHecho();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-5">
        <h3 className="font-semibold">Editar reserva del {reserva.fecha}</h3>
        <p className="mt-1 text-xs text-slate-400">
          Solo datos leves; fecha y monto requieren anular y recrear.
        </p>
        <label className="mt-3 block text-sm">
          Nombre
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2"
          />
        </label>
        <label className="mt-2 block text-sm">
          Casa
          <input
            value={casa}
            onChange={(e) => setCasa(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2"
          />
        </label>
        <label className="mt-2 block text-sm">
          Descripción
          <input
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2"
          />
        </label>
        {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
        <div className="mt-4 flex gap-2">
          <button
            onClick={guardar}
            disabled={enviando || !nombre.trim()}
            className="flex-1 rounded-lg bg-emerald-500 py-2 font-semibold text-slate-950 disabled:opacity-50"
          >
            {enviando ? "Guardando…" : "Guardar"}
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
