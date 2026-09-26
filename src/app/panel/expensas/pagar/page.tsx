"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, TriangleAlert, XCircle } from "lucide-react";
import { leerComprobante } from "@/lib/ocr";
import { compararMontos, formatBs } from "@/lib/contabilidad";
import { mesesPagables, totalEsperado } from "@/lib/expensas";

interface Casa {
  id: string;
  numero: number;
  vecino_nombre: string;
}

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function mesLargo(mes: string): string {
  const m = Number(mes.slice(5, 7));
  return `${MESES[m - 1]} ${mes.slice(0, 4)}`;
}

function mesActual(): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/La_Paz",
    year: "numeric",
    month: "2-digit",
  });
  const { year, month } = Object.fromEntries(
    fmt.formatToParts(new Date()).map((p) => [p.type, p.value])
  );
  return `${year}-${month}`;
}

export default function PagarExpensa() {
  const router = useRouter();
  const [casas, setCasas] = useState<Casa[]>([]);
  const [periodos, setPeriodos] = useState<{ mes: string; monto: number }[]>([]);
  const [pagados, setPagados] = useState<string[]>([]);
  const [casaId, setCasaId] = useState("");
  const [meses, setMeses] = useState<string[]>([]);
  const [monto, setMonto] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [montoDetectado, setMontoDetectado] = useState<number | null>(null);
  const [ocrDescartado, setOcrDescartado] = useState(false);
  const [difConfirmada, setDifConfirmada] = useState(false);
  const [ocrCorriendo, setOcrCorriendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    fetch("/api/expensas")
      .then((r) => r.json())
      .then((d) => {
        setCasas(d.casas ?? []);
        setPeriodos(d.periodos ?? []);
        // meses ya pagados por cualquier casa no importa: se recalcula al elegir casa
      })
      .catch(() => {});
  }, []);

  // Al elegir casa, cargar sus meses pagados
  useEffect(() => {
    if (!casaId) return;
    fetch("/api/expensas")
      .then((r) => r.json())
      .then((d) => {
        const pagadosDeCasa: string[] = [];
        for (const p of d.pagos ?? []) {
          if (p.casa_id !== casaId || p.estado !== "vigente") continue;
          for (const m of p.pagos_expensas_meses ?? []) {
            if (m.vigente) pagadosDeCasa.push(m.mes);
          }
        }
        setPagados(pagadosDeCasa);
        setMeses((prev) => prev.filter((m) => !pagadosDeCasa.includes(m)));
      })
      .catch(() => {});
  }, [casaId]);

  const pagables = useMemo(
    () => mesesPagables(mesActual(), periodos, pagados),
    [periodos, pagados]
  );
  const esperado = meses.length > 0 ? totalEsperado(meses, periodos) : null;
  const montoNum = monto === "" ? null : Number(monto);

  const comparacionOcr = compararMontos(montoNum, montoDetectado);
  const difiereTotal =
    esperado !== null && montoNum !== null && Math.abs(esperado - montoNum) > 0.01;

  const bloquear =
    enviando ||
    ocrCorriendo ||
    meses.length === 0 ||
    !casaId ||
    (comparacionOcr.estado === "difiere" && !ocrDescartado) ||
    (difiereTotal && !difConfirmada);

  function toggleMes(m: string) {
    setMeses((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m].sort()
    );
    setDifConfirmada(false);
  }

  async function alElegirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setArchivo(f);
    setMontoDetectado(null);
    setOcrDescartado(false);
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
      const res = await fetch("/api/expensas/pagar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          casa_id: casaId,
          meses,
          monto: Number(monto),
          comprobante_url,
          ocr_descartado: ocrDescartado,
          confirmar_diferencia: difConfirmada,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? "No se pudo registrar el pago");
        return;
      }
      router.push("/panel/expensas");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <form
        onSubmit={enviar}
        className="mx-auto max-w-lg rounded-2xl border border-white/10 bg-white/5 p-6"
      >
        <a href="/panel/expensas" className="text-sm text-emerald-300 hover:underline">
          ← Volver a expensas
        </a>
        <h1 className="mt-2 text-xl font-bold">Pagar mi expensa</h1>
        <p className="mt-1 text-sm text-slate-300">
          Elige tu casa y el/los meses (solo el actual y atrasados). Un solo
          comprobante puede cubrir varios meses.
        </p>

        <label className="mt-4 block text-sm">
          Mi casa
          <select
            value={casaId}
            onChange={(e) => setCasaId(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2"
          >
            <option value="">Elegir casa…</option>
            {casas.map((c) => (
              <option key={c.id} value={c.id}>
                Casa {c.numero} — {c.vecino_nombre}
              </option>
            ))}
          </select>
        </label>

        {casaId && (
          <fieldset className="mt-4">
            <legend className="text-sm font-medium">Meses a pagar</legend>
            {pagables.length === 0 ? (
              <p className="mt-2 text-sm text-slate-400">
                No tienes meses pendientes. ¡Todo al día!
              </p>
            ) : (
              <div className="mt-2 space-y-1.5">
                {pagables.map((m) => (
                  <label
                    key={m}
                    className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={meses.includes(m)}
                        onChange={() => toggleMes(m)}
                        className="h-4 w-4 accent-emerald-500"
                      />
                      {mesLargo(m)}
                    </span>
                    <span className="text-slate-400">
                      {formatBs(periodos.find((p) => p.mes === m)?.monto ?? 0)}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </fieldset>
        )}

        {meses.length > 0 && esperado !== null && (
          <p className="mt-3 rounded-lg bg-white/5 px-3 py-2 text-sm">
            Total esperado por {meses.length} mes/meses:{" "}
            <b className="text-emerald-300">{formatBs(esperado)}</b>
          </p>
        )}

        <label className="mt-4 block text-sm">
          Monto pagado (Bs)
          <input
            value={monto}
            onChange={(e) => {
              setMonto(e.target.value);
              setDifConfirmada(false);
              setOcrDescartado(false);
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

        {/* Validación OCR (RF-9) */}
        {montoDetectado !== null && monto !== "" && !ocrCorriendo && (
          <div
            className={`mt-3 flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm ${
              comparacionOcr.estado === "coincide"
                ? "bg-emerald-500/10 text-emerald-300"
                : ocrDescartado
                  ? "bg-slate-500/10 text-slate-300"
                  : "bg-amber-400/10 text-amber-300"
            }`}
          >
            {comparacionOcr.estado === "coincide" ? (
              <>
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                El monto coincide con el comprobante ({formatBs(montoDetectado)}).
              </>
            ) : ocrDescartado ? (
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
                    onClick={() => setOcrDescartado(true)}
                    className="underline underline-offset-2 hover:text-amber-200"
                  >
                    El OCR está mal, continuar igual
                  </button>
                </span>
              </>
            )}
          </div>
        )}

        {/* Validación contra el total esperado (RF-9) */}
        {difiereTotal && (
          <div className="mt-3 flex items-start gap-3 rounded-lg bg-amber-400/10 px-3 py-2.5 text-sm text-amber-300">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              El total esperado es {formatBs(esperado as number)} y escribiste{" "}
              {formatBs(Number(monto))}.{" "}
              {difConfirmada ? (
                <span className="text-slate-300">Diferencia confirmada.</span>
              ) : (
                <button
                  type="button"
                  onClick={() => setDifConfirmada(true)}
                  className="underline underline-offset-2 hover:text-amber-200"
                >
                  Es correcto, pagar este monto igual
                </button>
              )}
            </span>
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={bloquear}
          className="mt-6 w-full rounded-lg bg-emerald-500 py-2.5 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
        >
          {enviando
            ? "Registrando…"
            : "Registrar mi pago"}
        </button>
      </form>
    </main>
  );
}
