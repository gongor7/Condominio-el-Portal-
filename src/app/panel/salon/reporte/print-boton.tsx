"use client";

import { Printer } from "lucide-react";

/** RF-11: descarga del reporte como PDF vía impresión nativa del navegador. */
export function PrintBoton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-sm font-semibold hover:bg-white/10 print:hidden"
    >
      <Printer className="h-4 w-4" /> Descargar PDF
    </button>
  );
}
