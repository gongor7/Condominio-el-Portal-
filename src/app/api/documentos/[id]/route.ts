import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sesionActual } from "@/lib/auth";

const db = supabaseAdmin();

/** RF-4: eliminar documento (solo responsable) — quita registro y archivo del Storage. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sesion = await sesionActual();
  if (!sesion || sesion.rol !== "responsable") {
    return NextResponse.json({ error: "Solo el responsable" }, { status: 403 });
  }
  const { id } = await params;

  const { data: doc } = await db
    .from("documentos")
    .select("id, archivo_url")
    .eq("id", id)
    .maybeSingle();
  if (!doc) {
    return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
  }

  // Quitar el archivo del bucket (nombre = última parte de la URL pública)
  try {
    const nombre = doc.archivo_url.split("/").pop();
    if (nombre) {
      await db.storage.from("documentos").remove([decodeURIComponent(nombre)]);
    }
  } catch {
    /* si el archivo ya no existe, seguimos con el registro */
  }

  const { error } = await db.from("documentos").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: "No se pudo eliminar" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
