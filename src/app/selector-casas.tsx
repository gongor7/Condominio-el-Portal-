"use client";

import { useEffect, useState } from "react";
import { Home } from "lucide-react";

export interface CasaOpcion {
  id: string;
  numero: number;
  vecino_nombre: string;
}

/** Carga las casas (requiere sesión) — RF-17: sin casas avisa y solo deja continuar al responsable. */
export function useCasas() {
  const [casas, setCasas] = useState<CasaOpcion[]>([]);
  useEffect(() => {
    fetch("/api/expensas")
      .then((r) => r.json())
      .then((d) => setCasas(d.casas ?? []))
      .catch(() => {});
  }, []);
  return casas;
}

/** RF-16: selector de casas registradas para todos los formularios. */
export function SelectorCasas({
  casas,
  value,
  onChange,
  etiqueta = "Casa",
}: {
  casas: CasaOpcion[];
  value: string;
  onChange: (casa: CasaOpcion) => void;
  etiqueta?: string;
}) {
  return (
    <label className="block text-sm">
      {etiqueta}
      <div className="relative">
        <Home className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <select
          value={value}
          onChange={(e) => {
            const c = casas.find((x) => x.id === e.target.value);
            if (c) onChange(c);
          }}
          required
          className="mt-1 w-full appearance-none rounded-lg border border-white/10 bg-slate-900 py-2 pl-9 pr-3"
        >
          <option value="">Elegir casa…</option>
          {casas.map((c) => (
            <option key={c.id} value={c.id}>
              Casa {c.numero} — {c.vecino_nombre}
            </option>
          ))}
        </select>
      </div>
    </label>
  );
}
