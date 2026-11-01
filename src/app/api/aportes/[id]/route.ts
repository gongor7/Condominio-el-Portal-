import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sesionActual } from "@/lib/auth";

const db = supabaseAdmin();

/**
 * Eliminar un aporte (pago extraordinario) registrado por error.
 * Solo el responsable; físico porque los aportes no generan transacciones
 * contables (los totales de campaña se recalculan solos).
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sesion = await sesionActual();
  if (!sesion || sesion.rol !== "responsable") {
    return NextResponse.json({ error: "Solo el responsable" }, { status: 403 });
  }
  const { id } = await params;

  // Bloquear si la campaña ya fue subida al libro (descuadraría, Spec-011)
  const { data: aporte } = await db
    .from("aportes")
    .select("id, campanas(transaccion_id)")
    .eq("id", id)
    .maybeSingle();
  if (aporte) {
    const subida = (aporte.campanas as unknown as { transaccion_id: string | null } | null)
      ?.transaccion_id;
    if (subida) {
      return NextResponse.json(
        {
          error:
            "Esta campaña ya fue subida al libro contable; sus aportes no se pueden eliminar (anularía el cuadre).",
        },
        { status: 409 }
      );
    }
  }
  if (!aporte) {
    return NextResponse.json({ error: "Aporte no encontrado" }, { status: 404 });
  }

  const { error } = await db.from("aportes").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: "No se pudo eliminar" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
