"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { CheckCircle2, TriangleAlert, XCircle } from "lucide-react";
import { leerComprobante } from "@/lib/ocr";
import { compararMontos, formatBs } from "@/lib/contabilidad";
import { montoCompleto } from "@/lib/deudas";

interface Multa {
  id: string;
  monto: number;
  motivo: string;
  estado: string;
  fecha: string;
  casa: { numero: number; vecino_nombre: string } | null;
}

/** RF-3: el vecino paga su multa completa con comprobante validado por OCR. */
export default function PagarMulta() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [multa, setMulta] = useState<Multa | null>(null);
  const [monto, setMonto] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [montoDetectado, setMontoDetectado] = useState<number | null>(null);
  const [descartado, setDescartado] = useState(false);
  const [ocrCorriendo, setOcrCorriendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/multas?id=${id}`)
      .then((r) => r.json())
      .then((d) => {
        const m = d.multa;
        if (m) {
          setMulta(m);
          setMonto(String(m.monto));
        }
      })
      .catch(() => {});
  }, [id]);

  const comparacion = compararMontos(
    monto === "" ? null : Number(monto),
    montoDetectado
  );
  const faltaCompleto = multa ? !montoCompleto(Number(monto || 0), multa.monto) : true;

  async function alElegirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setArchivo(f);
    setMontoDetectado(null);
    setDescartado(false);
    setError(null);
    setOcrCorriendo(true);
    try {
      const r = await leerComprobante(f);
      setMontoDetectado(r.monto);
      if (r.monto !== null) setMonto(String(r.monto));
    } catch {
      setError("No se pudo leer el comprobante. Escribe el monto a mano.");
    } finally {
      setOcrCorriendo(false);
    }
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      let comprobante_url: string | null = null;
      if (archivo) {
        const fd = new FormData();
        fd.append("archivo", archivo);
        const up = await fetch("/api/subir-archivo", { method: "POST", body: fd });
        const upd = await up.json();
        if (!up.ok) {
          setError(upd.error ?? "No se pudo subir el comprobante");
          return;
        }
        comprobante_url = upd.url;
      }
      const res = await fetch(`/api/multas/${id}/pagar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comprobante_url, monto: Number(monto) }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? "No se pudo registrar el pago");
        return;
      }
      router.push("/panel/casas");
    } finally {
      setEnviando(false);
    }
  }

  if (!multa) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
        <p className="mx-auto max-w-lg text-sm text-slate-400">Cargando multa…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <form
        onSubmit={enviar}
        className="mx-auto max-w-lg rounded-2xl border border-white/10 bg-white/5 p-6"
      >
        <a href="/panel/casas" className="text-sm text-emerald-300 hover:underline">
          ← Volver a Casas
        </a>
        <h1 className="mt-2 text-xl font-bold">Pagar multa</h1>
        <div className="mt-3 rounded-xl bg-red-500/10 px-4 py-3">
          <p className="font-semibold">
            Casa {multa.casa?.numero} — {multa.casa?.vecino_nombre}
          </p>
          <p className="mt-1 text-sm text-red-300">
            {formatBs(multa.monto)} · {multa.motivo} · {multa.fecha}
          </p>
        </div>

        <label className="mt-4 block text-sm">
          Monto pagado (Bs) — debe ser al menos {formatBs(multa.monto)}
          <input
            value={monto}
            onChange={(e) => {
              setMonto(e.target.value);
              setDescartado(false);
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
        {ocrCorriendo && (
          <p className="mt-2 animate-pulse text-sm text-emerald-300">
            Leyendo comprobante…
          </p>
        )}

        {montoDetectado !== null && monto !== "" && !ocrCorriendo && (
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
                  {formatBs(Number(monto))}.{" "}
                  <button
                    type="button"
                    onClick={() => setDescartado(true)}
                    className="underline underline-offset-2 hover:text-amber-200"
                  >
                    El OCR está mal, continuar igual
                  </button>
                </span>
              </>
            )}
          </div>
        )}

        {faltaCompleto && (
          <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">
            La multa se paga completa: {formatBs(multa.monto)}.
          </p>
        )}
        {error && (
          <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={enviando || ocrCorriendo || faltaCompleto || (comparacion.estado === "difiere" && !descartado)}
          className="mt-6 w-full rounded-lg bg-emerald-500 py-2.5 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
        >
          {enviando ? "Registrando…" : "Pagar multa"}
        </button>
      </form>
    </main>
  );
}
