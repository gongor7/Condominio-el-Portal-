"use client";

import { useEffect, useState } from "react";
import { Gavel } from "lucide-react";
import { formatBs } from "@/lib/contabilidad";

interface MultaPublica {
  casa: number | null;
  vecino: string;
  motivo: string;
  monto: number;
  fecha: string;
}

/** RF-2 (Spec-005): multas impagas visibles en la landing, sin sesión. */
export function MultasPublico() {
  const [multas, setMultas] = useState<MultaPublica[] | null>(null);

  useEffect(() => {
    fetch("/api/multas")
      .then((r) => r.json())
      .then((d) => setMultas(d.multas ?? []))
      .catch(() => setMultas([]));
  }, []);

  if (multas === null) return null;

  if (multas.length === 0) {
    return (
      <div className="rounded-[1.25rem] border border-emerald-400/20 bg-emerald-400/5 p-5 text-center">
        <p className="flex items-center justify-center gap-2 font-semibold text-emerald-300">
          <Gavel className="h-5 w-5" />
          Sin multas impagas — ¡condominio en regla!
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[1.25rem] border border-white/10 bg-slate-900/90 p-5 backdrop-blur">
      <p className="flex items-center gap-2 font-semibold">
        <Gavel className="h-5 w-5 text-red-400" />
        Multas impagas ({multas.length})
      </p>
      <ul className="mt-3 divide-y divide-white/5">
        {multas.map((m, i) => (
          <li
            key={i}
            className="flex items-center justify-between gap-3 py-2.5 text-sm"
          >
            <span className="min-w-0">
              <b>Casa {m.casa}</b>
              <span className="ml-2 text-slate-400">{m.motivo}</span>
            </span>
            <b className="shrink-0 text-red-300">{formatBs(m.monto)}</b>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-slate-500">
        Las casas con multa impaga o expensa vencida no pueden reservar el salón
        hasta ponerse al día.
      </p>
    </div>
  );
}
