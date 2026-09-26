import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sesionActual } from "@/lib/auth";

const db = supabaseAdmin();

/** RF-10: edición leve — solo nombre, casa y descripción. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sesion = await sesionActual();
  if (!sesion || sesion.rol !== "responsable") {
    return NextResponse.json({ error: "Solo el responsable" }, { status: 403 });
  }
  const { id } = await params;
  const { vecino_nombre, vecino_casa, descripcion } = await req.json().catch(() => ({}));

  if (typeof vecino_nombre !== "string" || !vecino_nombre.trim()) {
    return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
  }

  const { data: reserva } = await db
    .from("reservas")
    .select("id, estado")
    .eq("id", id)
    .maybeSingle();
  if (!reserva) {
    return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
  }
  if (reserva.estado !== "vigente") {
    return NextResponse.json({ error: "Una reserva anulada no se edita" }, { status: 409 });
  }

  const { error } = await db
    .from("reservas")
    .update({
      vecino_nombre: vecino_nombre.trim(),
      vecino_casa: typeof vecino_casa === "string" ? vecino_casa.trim() : "",
      descripcion: typeof descripcion === "string" ? descripcion.trim() : "",
    })
    .eq("id", id);
  if (error) {
    return NextResponse.json({ error: "No se pudo editar" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
