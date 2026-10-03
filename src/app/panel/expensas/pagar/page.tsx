"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, FileText, TriangleAlert, X } from "lucide-react";
import { formatBs } from "@/lib/contabilidad";
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
  
  const [casaId, setCasaId] = useState("");
  const [meses, setMeses] = useState<string[]>([]);
  const [monto, setMonto] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [difConfirmada, setDifConfirmada] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const [todosLosPagos, setTodosLosPagos] = useState<
    {
      casa_id: string;
      estado: string;
      pagos_expensas_meses: { mes: string; vigente: boolean }[];
    }[]
  >([]);

  useEffect(() => {
    fetch("/api/expensas")
      .then((r) => r.json())
      .then((d) => {
        setCasas(d.casas ?? []);
        setPeriodos(d.periodos ?? []);
        setTodosLosPagos(d.pagos ?? []);
      })
      .catch(() => {});
  }, []);

  // Al elegir casa, calcular sus meses pagados en memoria al instante (derivado, sin efecto)
  const pagados = useMemo(() => {
    if (!casaId) return [] as string[];
    const res: string[] = [];
    for (const p of todosLosPagos) {
      if (p.casa_id !== casaId || p.estado !== "vigente") continue;
      for (const m of p.pagos_expensas_meses ?? []) {
        if (m.vigente) res.push(m.mes);
      }
    }
    return res;
  }, [casaId, todosLosPagos]);

  const pagables = useMemo(
    () => mesesPagables(mesActual(), periodos, pagados),
    [periodos, pagados]
  );
  const esperado = meses.length > 0 ? totalEsperado(meses, periodos) : null;
  const montoNum = monto === "" ? null : Number(monto);

  const difiereTotal =
    esperado !== null && montoNum !== null && Math.abs(esperado - montoNum) > 0.01;

  const bloquear =
    enviando ||
    meses.length === 0 ||
    !casaId ||
    !archivo ||
    !monto ||
    Number(monto) <= 0 ||
    (difiereTotal && !difConfirmada);

  let avisoBloqueo: string | null = null;
  if (!casaId) {
    avisoBloqueo = "Selecciona tu casa para ver los meses pendientes.";
  } else if (periodos.length === 0) {
    avisoBloqueo = "No hay períodos definidos por la administración aún.";
  } else if (pagables.length === 0) {
    avisoBloqueo = "Tu casa no tiene meses pendientes de pago.";
  } else if (meses.length === 0) {
    avisoBloqueo = "Marca en la lista al menos un mes a pagar.";
  } else if (!monto || Number(monto) <= 0) {
    avisoBloqueo = "Escribe el monto pagado en bolivianos.";
  } else if (!archivo) {
    avisoBloqueo = "Adjunta la imagen o PDF del comprobante de pago.";
  } else if (difiereTotal && !difConfirmada) {
  } else if (difiereTotal && !difConfirmada) {
    avisoBloqueo = "El monto difiere del total esperado (confirma la diferencia para continuar).";
  }

  function toggleMes(m: string) {
    setMeses((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m].sort()
    );
    setDifConfirmada(false);
  }

  function alElegirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    setArchivo(e.target.files?.[0] ?? null);
  }

  function quitarArchivo() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setArchivo(null);
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
          meses: meses.filter((m) => pagables.includes(m)),
          monto: Number(monto),
          comprobante_url,
          ocr_descartado: false,
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
            <legend className="text-sm font-medium">
              ¿Qué mes(es) estás pagando? <span className="text-red-400">*</span>
            </legend>
            <p className="mt-0.5 text-xs text-slate-400">
              Marca las casillas de los meses que cubre tu pago (puedes pagar varios meses juntos):
            </p>
            {periodos.length === 0 ? (
              <p className="mt-2 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-300">
                ⚠️ <b>No hay períodos configurados:</b> La administración aún no ha definido el monto de expensas para ningún mes en el panel de Expensas. El responsable debe definir los períodos primero.
              </p>
            ) : pagables.length === 0 ? (
              <p className="mt-2 text-sm text-slate-400">
                No tienes meses pendientes. ¡Todo al día!
              </p>
            ) : (
              <div className="mt-2 space-y-1.5">
                {pagables.map((m) => {
                  const seleccionado = meses.includes(m);
                  return (
                    <label
                      key={m}
                      className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${
                        seleccionado
                          ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-200"
                          : "border-white/10 bg-slate-900 text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={seleccionado}
                          onChange={() => toggleMes(m)}
                          className="h-4 w-4 rounded accent-emerald-500"
                        />
                        <span className="font-medium capitalize">{mesLargo(m)}</span>
                      </span>
                      <span className="text-slate-400">
                        {formatBs(periodos.find((p) => p.mes === m)?.monto ?? 0)}
                      </span>
                    </label>
                  );
                })}
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
          Monto pagado (Bs) <span className="text-red-400">*</span>
          <input
            value={monto}
            onChange={(e) => {
              setMonto(e.target.value);
              setDifConfirmada(false);
              }}
            required
            inputMode="decimal"
            placeholder="Ej. 150"
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2"
          />
        </label>

        {!archivo ? (
          <label className="mt-4 block text-sm">
            Comprobante (foto o PDF) <span className="text-red-400">*</span>
            <input
              type="file"
              accept="image/*,application/pdf"
              required
              onChange={alElegirArchivo}
              className="mt-1 w-full cursor-pointer rounded-lg border border-dashed border-white/20 bg-slate-900 p-3 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-emerald-500 file:px-3 file:py-1.5 file:font-semibold file:text-slate-950 hover:border-emerald-500/50"
            />
          </label>
        ) : (
          <div className="mt-4 rounded-xl border border-white/10 bg-slate-900/90 p-3">
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2 text-xs">
              <span className="flex items-center gap-1.5 truncate font-medium text-slate-200">
                <FileText className="h-4 w-4 shrink-0 text-emerald-400" />
                <span className="truncate">{archivo.name}</span>
                <span className="text-slate-400">
                  ({(archivo.size / 1024).toFixed(1)} KB)
                </span>
              </span>
              <button
                type="button"
                onClick={quitarArchivo}
                className="flex shrink-0 items-center gap-1 text-xs text-red-400 hover:text-red-300 hover:underline"
              >
                <X className="h-3.5 w-3.5" /> Cambiar comprobante
              </button>
            </div>

            {/* Vista previa de imagen o PDF */}
            <div className="mt-2.5">
              {archivo.type.startsWith("image/") && previewUrl && (
                <div className="flex max-h-80 items-center justify-center overflow-hidden rounded-lg border border-white/5 bg-black/40 p-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Previsualización del comprobante"
                    className="max-h-80 w-auto rounded object-contain"
                  />
                </div>
              )}

              {archivo.type === "application/pdf" && previewUrl && (
                <div className="overflow-hidden rounded-lg border border-white/10 bg-slate-950">
                  <iframe
                    src={previewUrl}
                    title="Previsualización del comprobante PDF"
                    className="h-80 w-full rounded-t-lg"
                  />
                  <div className="border-t border-white/5 bg-slate-900/90 p-2 text-center text-xs">
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-emerald-400 underline underline-offset-2 hover:text-emerald-300"
                    >
                      <Eye className="h-3.5 w-3.5" /> Abrir PDF en pantalla completa ↗
                    </a>
                  </div>
                </div>
              )}
            </div>
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

        {bloquear && avisoBloqueo && !enviando && (
          <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
            {avisoBloqueo}
          </div>
        )}

        <button
          type="submit"
          disabled={bloquear}
          className="mt-4 w-full rounded-lg bg-emerald-500 py-2.5 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
        >
          {enviando
            ? "Registrando…"
            : "Registrar mi pago"}
        </button>
      </form>
    </main>
  );
}
