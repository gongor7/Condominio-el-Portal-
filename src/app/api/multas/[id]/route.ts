import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sesionActual } from "@/lib/auth";

const db = supabaseAdmin();

/**
 * Borrar multa creada por error (Spec-006): SOLO impagas.
 * Una multa pagada tocó dinero y no se borra — se anula con ajuste (auditoría).
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

  const { data: multa } = await db
    .from("multas")
    .select("id, estado")
    .eq("id", id)
    .maybeSingle();
  if (!multa) {
    return NextResponse.json({ error: "Multa no encontrada" }, { status: 404 });
  }
  if (multa.estado !== "impaga") {
    return NextResponse.json(
      { error: "Solo se pueden borrar multas impagas; las pagadas se anulan" },
      { status: 409 }
    );
  }

  const { error } = await db.from("multas").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: "No se pudo borrar" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
