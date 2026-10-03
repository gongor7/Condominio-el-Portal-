"use client";

import { Trash2 } from "lucide-react";

/** Eliminar aporte (pago extraordinario) registrado por error — solo responsable. */
export function BorrarAporte({ aporteId }: { aporteId: string }) {
  async function borrar() {
    if (
      !window.confirm(
        "¿Eliminar este aporte? Solo si fue registrado por error; el total de la campaña se recalcula."
      )
    ) {
      return;
    }
    const res = await fetch(`/api/aportes/${aporteId}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json();
      window.alert(d.error ?? "No se pudo eliminar");
      return;
    }
    window.location.reload();
  }
  return (
    <button
      onClick={borrar}
      aria-label="Eliminar aporte"
      title="Eliminar (registrado por error)"
      className="rounded-full p-1 hover:bg-red-500/20"
    >
      <Trash2 className="h-3.5 w-3.5 text-red-400" />
    </button>
  );
}
