"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { hoyAmericaLaPaz } from "@/lib/salon";
import { SelectorCasas, useCasas, type CasaOpcion } from "@/app/selector-casas";

export default function NuevaReserva() {
  const router = useRouter();
  const hoy = hoyAmericaLaPaz();
  const casas = useCasas();
  const [modalidad, setModalidad] = useState<"casa" | "todos">("casa");
  const [casa, setCasa] = useState<CasaOpcion | null>(null);
  const [fecha, setFecha] = useState("");
  const [monto, setMonto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  function alElegirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    setArchivo(e.target.files?.[0] ?? null);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      let comprobanteUrl: string | null = null;
      if (modalidad === "casa" && archivo) {
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
      const res = await fetch("/api/salon/crear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fecha,
          casa_id: modalidad === "casa" ? casa?.id : null,
          vecino_nombre: casa?.vecino_nombre ?? "",
          vecino_casa: casa ? `Casa ${casa.numero}` : "",
          monto: modalidad === "casa" ? Number(monto) : 0,
          descripcion,
          comprobante_url: comprobanteUrl,
          modalidad,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? "No se pudo crear la reserva");
        return;
      }
      router.push("/panel/salon");
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
        <a href="/panel/salon" className="text-sm text-emerald-300 hover:underline">
          ← Volver
        </a>
        <h1 className="mt-2 text-xl font-bold">Nueva reserva del salón</h1>

        {/* Modalidad (RF-8/RF-9) */}
        <fieldset className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <label
            className={`cursor-pointer rounded-lg border px-3 py-2 text-center ${
              modalidad === "casa"
                ? "border-emerald-400 bg-emerald-500/15"
                : "border-white/10 bg-slate-900"
            }`}
          >
            <input
              type="radio"
              name="modalidad"
              className="sr-only"
              checked={modalidad === "casa"}
              onChange={() => setModalidad("casa")}
            />
            Vecino (pagada)
          </label>
          <label
            className={`cursor-pointer rounded-lg border px-3 py-2 text-center ${
              modalidad === "todos"
                ? "border-emerald-400 bg-emerald-500/15"
                : "border-white/10 bg-slate-900"
            }`}
          >
            <input
              type="radio"
              name="modalidad"
              className="sr-only"
              checked={modalidad === "todos"}
              onChange={() => setModalidad("todos")}
            />
            Contratado por todos
          </label>
        </fieldset>
        <p className="mt-2 text-xs text-slate-400">
          {modalidad === "todos"
            ? "Evento comunitario del condominio entero: sin casa, sin pago."
            : "Cada casa con multa impaga o expensa vencida no puede reservar."}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="text-sm">
            Fecha
            <input
              type="date"
              value={fecha}
              min={hoy}
              onChange={(e) => setFecha(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2"
            />
          </label>
          {modalidad === "casa" && (
            <div className="text-sm">
              <SelectorCasas
                casas={casas}
                value={casa?.id ?? ""}
                onChange={setCasa}
                etiqueta="Casa que reserva"
              />
            </div>
          )}
        </div>

        {modalidad === "casa" && (
          <>
            <label className="mt-3 block text-sm">
              Monto (Bs)
              <input
                value={monto}
                onChange={(e) => {
                  setMonto(e.target.value);
                              }}
                required
                inputMode="decimal"
                className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2"
              />
            </label>

            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={alElegirArchivo}
              className="mt-3 w-full rounded-lg border border-dashed border-white/20 bg-slate-900 p-3 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-emerald-500 file:px-3 file:py-1.5 file:font-semibold file:text-slate-950"
            />
            <p className="mt-1 text-xs text-slate-500">Comprobante opcional.</p>
          </>
        )}

        <label className="mt-3 block text-sm">
          Descripción del evento
          <input
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder={
              modalidad === "todos"
                ? "Ej. asamblea general de vecinos"
                : "Ej. cumpleaños, reunión familiar"
            }
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
          {guardando ? "Guardando…" : "Crear reserva"}
        </button>
      </form>
    </main>
  );
}
