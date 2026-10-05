import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sesionActual } from "@/lib/auth";

const db = supabaseAdmin();

/** RF-2: listar documentos (sesión requerida). */
export async function GET() {
  const sesion = await sesionActual();
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { data, error } = await db
    .from("documentos")
    .select("*")
    .order("creado_en", { ascending: false });
  if (error) {
    return NextResponse.json({ error: "No se pudo cargar" }, { status: 500 });
  }
  return NextResponse.json({ documentos: data ?? [] });
}

/** RF-1: subir documento (solo responsable). */
export async function POST(req: NextRequest) {
  const sesion = await sesionActual();
  if (!sesion || sesion.rol !== "responsable") {
    return NextResponse.json({ error: "Solo el responsable" }, { status: 403 });
  }
  const { titulo, descripcion, categoria, archivo_url, archivo_tipo } =
    await req.json().catch(() => ({}));

  if (typeof titulo !== "string" || !titulo.trim()) {
    return NextResponse.json({ error: "Falta el título" }, { status: 400 });
  }
  if (typeof archivo_url !== "string" || !archivo_url) {
    return NextResponse.json({ error: "Sube el archivo primero" }, { status: 400 });
  }
  const CATEGORIAS = ["contrato", "escritura", "plano", "recibo", "otro"];
  const cat = CATEGORIAS.includes(categoria) ? categoria : "otro";

  const { data, error } = await db
    .from("documentos")
    .insert({
      titulo: titulo.trim(),
      descripcion: typeof descripcion === "string" ? descripcion.trim() : "",
      categoria: cat,
      archivo_url,
      archivo_tipo: typeof archivo_tipo === "string" ? archivo_tipo : "application/pdf",
    })
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: "No se pudo guardar" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, documento: data });
}
