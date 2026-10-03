import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sesionActual } from "@/lib/auth";

const db = supabaseAdmin();

/** RF-3: historial de ediciones de un movimiento — lectura para todos los roles. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const sesion = await sesionActual();
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const { data, error } = await db
    .from("ediciones_transacciones")
    .select("campo, anterior, nuevo, autor, motivo, creado_en")
    .eq("transaccion_id", id)
    .order("creado_en", { ascending: true });
  if (error) {
    return NextResponse.json({ error: "No se pudo leer el historial" }, { status: 500 });
  }
  return NextResponse.json({ ediciones: data ?? [] });
}
