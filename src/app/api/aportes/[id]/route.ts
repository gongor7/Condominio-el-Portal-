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

  const { data: aporte } = await db
    .from("aportes")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (!aporte) {
    return NextResponse.json({ error: "Aporte no encontrado" }, { status: 404 });
  }

  const { error } = await db.from("aportes").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: "No se pudo eliminar" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
