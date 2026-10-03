"use client";

/**
 * Doble confirmación para subir sin comprobante (adenda Spec-007).
 * Se muestra solo cuando no se adjuntó archivo; exige check explícito.
 */
export function ConfirmarSinComprobante({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="mt-3 flex items-start gap-2 rounded-xl bg-amber-400/10 p-3 text-sm text-amber-200">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-amber-400"
      />
      <span>
        Seguro que quiero subirlo <b>sin el depósito/comprobante</b>. Entiendo que
        quedará registrado sin respaldo.
      </span>
    </label>
  );
}
