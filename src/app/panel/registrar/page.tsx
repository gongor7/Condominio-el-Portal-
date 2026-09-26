"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle2, TriangleAlert, XCircle } from "lucide-react";
import { leerComprobante } from "@/lib/ocr";
import { compararMontos, formatBs } from "@/lib/contabilidad";

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
  const [montoDetectado, setMontoDetectado] = useState<number | null>(null);
  const [descartado, setDescartado] = useState(false);
  const [ocrCorriendo, setOcrCorriendo] = useState(false);
  const [tipo, setTipo] = useState<"ingreso" | "egreso">("egreso");
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [categoria, setCategoria] = useState("otros");
  const [descripcion, setDescripcion] = useState("");
  const [campanaId, setCampanaId] = useState("");
  const [campanas, setCampanas] = useState<
    { id: string; titulo: string }[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Cargar campañas activas para asociar gastos
  useEffect(() => {
    fetch("/api/campanas")
      .then((r) => r.json())
      .then((d) => setCampanas(d.campanas ?? []))
      .catch(() => {});
  }, []);

  // Spec-002 RF-3: comparación en vivo monto escrito vs OCR
  const comparacion = compararMontos(
    monto === "" ? null : Number(monto),
    montoDetectado
  );
  const bloquearPorOcr =
    comparacion.estado === "difiere" && !descartado && !ocrCorriendo;

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
      if (r.fecha) setFecha(r.fecha);
    } catch {
      setError("No se pudo leer el archivo con OCR. Completa los datos a mano.");
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
          Sube el comprobante: el OCR lee el monto y la fecha, tú confirmas.
        </p>

        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={alElegirArchivo}
          className="mt-4 w-full rounded-lg border border-dashed border-white/20 bg-slate-900 p-3 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-emerald-500 file:px-3 file:py-1.5 file:font-semibold file:text-slate-950"
        />
        {ocrCorriendo && (
          <p className="mt-2 animate-pulse text-sm text-emerald-300">
            Leyendo comprobante con OCR…
          </p>
        )}

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
              onChange={(e) => {
                setMonto(e.target.value);
                setDescartado(false);
              }}
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

        {/* Verificación OCR del monto (Spec-002 RF-3) */}
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
                Monto del OCR descartado ({formatBs(montoDetectado)}). Continúas
                con el monto manual.
              </>
            ) : (
              <>
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  El comprobante dice {formatBs(montoDetectado)} y escribiste{" "}
                  {formatBs(Number(monto))} (diferencia{" "}
                  {formatBs(Math.abs(comparacion.diferencia))}).
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
          disabled={guardando || ocrCorriendo || bloquearPorOcr}
          className="mt-6 w-full rounded-lg bg-emerald-500 py-2.5 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
        >
          {guardando
            ? "Guardando…"
            : bloquearPorOcr
              ? "Corrige el monto o confirma la discrepancia"
              : "Publicar movimiento"}
        </button>
      </form>
    </main>
  );
}
