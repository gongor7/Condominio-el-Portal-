"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookCheck, CircleCheck } from "lucide-react";
import { formatBs } from "@/lib/contabilidad";

/**
 * Spec-011: el responsable cierra la campaña y sube su recaudación al libro
 * contable como UN ingreso; luego lo lleva a la fila del pago en el libro.
 */
export function SubirLibro({
  campanaId,
  estado,
  recaudado,
}: {
  campanaId: string;
  estado: "activa" | "cerrada";
  recaudado: number;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function subir() {
    const etiqueta =
      estado === "activa"
        ? `Cerrar la campaña y registrar ${formatBs(recaudado)} en el libro contable. ¿Confirmar?`
        : `Registrar ${formatBs(recaudado)} de esta campaña en el libro contable. ¿Confirmar?`;
    if (!window.confirm(etiqueta)) return;

    setEnviando(true);
    setError(null);
    try {
      const res = await fetch(`/api/campanas/${campanaId}/subir-libro`, {
        method: "POST",
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? "No se pudo subir al libro");
        return;
      }
      if (d.sin_ingreso) {
        router.refresh();
        return;
      }
      // Redirigir a la fila del pago en el libro, resaltada
      router.push(`/panel?mes=${d.mes}&resaltar=${d.transaccion_id}`);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      <button
        onClick={subir}
        disabled={enviando}
        className="flex items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
      >
        <BookCheck className="h-4 w-4" />
        {enviando
          ? "Subiendo…"
          : estado === "activa"
            ? "Cerrar y subir al libro"
            : "Subir al libro"}
      </button>
      {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
    </div>
  );
}

/** Badge para campañas ya subidas: lleva directo a su fila en el libro. */
export function YaEnLibro({
  transaccionId,
  mes,
}: {
  transaccionId: string;
  mes: string;
}) {
  return (
    <a
      href={`/panel?mes=${mes}&resaltar=${transaccionId}`}
      className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25"
    >
      <CircleCheck className="h-3.5 w-3.5" /> En el libro contable — ver
    </a>
  );
}
