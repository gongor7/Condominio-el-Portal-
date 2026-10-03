"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SelectorCasas, useCasas, type CasaOpcion } from "@/app/selector-casas";
import { ConfirmarSinComprobante } from "@/app/confirmar-sin-comprobante";

export default function FormAporte({ campanaId }: { campanaId: string }) {
  const router = useRouter();
  const casas = useCasas();
  const [casa, setCasa] = useState<CasaOpcion | null>(null);
  const [monto, setMonto] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [sinComprobante, setSinComprobante] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [enviando, setEnviando] = useState(false);

  function alElegirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    setArchivo(e.target.files?.[0] ?? null);
    setSinComprobante(false);
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
      const res = await fetch("/api/aportes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campana_id: campanaId, vecino_nombre: casa?.vecino_nombre ?? "", casa_id: casa?.id ?? null, monto: Number(monto), comprobante_url }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? "No se pudo registrar el aporte");
        return;
      }
      setOk(true);
      setMonto("");
      setArchivo(null);
          router.refresh();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form
      onSubmit={enviar}
      className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-5"
    >
      <h2 className="font-semibold">Quiero aportar</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <SelectorCasas casas={casas} value={casa?.id ?? ""} onChange={setCasa} etiqueta="Tu casa" />
        <input
          value={monto}
          onChange={(e) => {
            setMonto(e.target.value);
                  }}
          required
          inputMode="decimal"
          placeholder="Monto en Bs"
          className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm"
        />
      </div>
      <input
        type="file"
        accept="image/*,application/pdf"
        onChange={alElegirArchivo}
        className="mt-3 w-full rounded-lg border border-dashed border-white/20 bg-slate-900 p-2.5 text-xs file:mr-3 file:rounded-md file:border-0 file:bg-emerald-500 file:px-3 file:py-1 file:text-slate-950"
      />

      {!archivo && (
        <ConfirmarSinComprobante checked={sinComprobante} onChange={setSinComprobante} />
      )}

      {error && (
        <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
      {ok && (
        <p className="mt-3 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          ¡Gracias por tu aporte! Ya aparece en la lista.
        </p>
      )}
      <button
        type="submit"
        disabled={enviando || (!archivo && !sinComprobante)}
        className="mt-4 w-full rounded-lg bg-emerald-500 py-2.5 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
      >
        {enviando ? "Enviando…" : "Registrar mi aporte"}
      </button>
    </form>
  );
}
