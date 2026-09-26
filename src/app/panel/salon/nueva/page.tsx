"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, TriangleAlert, XCircle } from "lucide-react";
import { leerComprobante } from "@/lib/ocr";
import { compararMontos, formatBs } from "@/lib/contabilidad";
import { hoyAmericaLaPaz } from "@/lib/salon";

export default function NuevaReserva() {
  const router = useRouter();
  const hoy = hoyAmericaLaPaz();
  const [fecha, setFecha] = useState("");
  const [nombre, setNombre] = useState("");
  const [casa, setCasa] = useState("");
  const [monto, setMonto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [montoDetectado, setMontoDetectado] = useState<number | null>(null);
  const [descartado, setDescartado] = useState(false);
  const [ocrCorriendo, setOcrCorriendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const gratis = monto !== "" && Number(monto) === 0;
  const comparacion = gratis
    ? { estado: "sin_deteccion" as const, diferencia: 0 }
    : compararMontos(monto === "" ? null : Number(monto), montoDetectado);
  const bloquearPorOcr =
    comparacion.estado === "difiere" && !descartado && !ocrCorriendo;

  async function alElegirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setArchivo(f);
    setMontoDetectado(null);
    setDescartado(false);
    setError(null);
    if (f.type === "application/pdf") {
      setError("PDF adjuntado sin lectura automática: escribe el monto a mano.");
      return;
    }
    setOcrCorriendo(true);
    try {
      const r = await leerComprobante(f);
      setMontoDetectado(r.monto);
      if (r.monto !== null) setMonto(String(r.monto));
    } catch {
      setError("No se pudo leer el comprobante. Completa el monto a mano.");
    } finally {
      setOcrCorriendo(false);
    }
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      let comprobanteUrl: string | null = null;
      if (archivo && !gratis) {
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
          vecino_nombre: nombre,
          vecino_casa: casa,
          monto: Number(monto),
          descripcion,
          comprobante_url: comprobanteUrl,
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
        <p className="mt-1 text-sm text-slate-300">
          Solo reservas pagadas; monto 0 = evento comunitario gratuito.
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
          <label className="text-sm">
            Monto (Bs) — 0 si es gratis
            <input
              value={monto}
              onChange={(e) => {
                setMonto(e.target.value);
                setDescartado(false);
              }}
              required
              inputMode="decimal"
              placeholder="0 para gratuita"
              className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Vecino (nombre)
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Casa
            <input
              value={casa}
              onChange={(e) => setCasa(e.target.value)}
              placeholder="Ej. Casa 3"
              className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2"
            />
          </label>
        </div>

        <label className="mt-3 block text-sm">
          Descripción del evento
          <input
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Ej. cumpleaños, reunión de vecinos"
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2"
          />
        </label>

        {!gratis && (
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={alElegirArchivo}
            className="mt-3 w-full rounded-lg border border-dashed border-white/20 bg-slate-900 p-3 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-emerald-500 file:px-3 file:py-1.5 file:font-semibold file:text-slate-950"
          />
        )}
        {ocrCorriendo && (
          <p className="mt-2 animate-pulse text-sm text-emerald-300">
            Leyendo comprobante…
          </p>
        )}

        {!gratis &&
          montoDetectado !== null &&
          monto !== "" &&
          !ocrCorriendo && (
            <div
              className={`mt-3 flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm ${
                comparacion.estado === "coincide"
                  ? "bg-emerald-500/10 text-emerald-300"
                  : descartado
                    ? "bg-slate-500/10 text-slate-300"
                    : "bg-amber-400/10 text-amber-300"
              }`}
            >
              {comparacion.estado === "coincide" ? (
                <>
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  El monto coincide con el comprobante ({formatBs(montoDetectado)}).
                </>
              ) : descartado ? (
                <>
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  Monto del OCR descartado ({formatBs(montoDetectado)}).
                </>
              ) : (
                <>
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    El comprobante dice {formatBs(montoDetectado)} y escribiste{" "}
                    {formatBs(Number(monto))}.
                    <button
                      type="button"
                      onClick={() => setDescartado(true)}
                      className="ml-1 underline underline-offset-2 hover:text-amber-200"
                    >
                      El monto detectado está mal, continuar igual
                    </button>
                  </span>
                </>
              )}
            </div>
          )}

        {error && (
          <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={guardando || ocrCorriendo || bloquearPorOcr}
          className="mt-6 w-full rounded-lg bg-emerald-500 py-2.5 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
        >
          {guardando
            ? "Guardando…"
            : bloquearPorOcr
              ? "Corrige el monto o confirma la discrepancia"
              : gratis
                ? "Crear reserva gratuita"
                : "Crear reserva y registrar pago"}
        </button>
      </form>
    </main>
  );
}
