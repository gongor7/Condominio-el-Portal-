import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sesionActual } from "@/lib/auth";

export async function GET() {
  const sesion = await sesionActual();
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { data } = await supabase
    .from("campanas")
    .select("id, titulo, estado")
    .eq("estado", "activa")
    .order("creado_en", { ascending: false });
  return NextResponse.json({ campanas: data ?? [] });
}

export async function POST(req: NextRequest) {
  const sesion = await sesionActual();
  if (!sesion || sesion.rol !== "responsable") {
    return NextResponse.json(
      { error: "Solo el responsable puede crear campañas" },
      { status: 403 }
    );
  }
  const { titulo, descripcion, meta } = await req.json().catch(() => ({}));
  if (typeof titulo !== "string" || !titulo.trim()) {
    return NextResponse.json({ error: "Falta el título" }, { status: 400 });
  }
  const metaNum = meta === null || meta === "" || meta === undefined ? null : Number(meta);
  if (metaNum !== null && !(metaNum > 0)) {
    return NextResponse.json({ error: "Meta inválida" }, { status: 400 });
  }

  const { data: gestion } = await supabase
    .from("gestiones")
    .select("id")
    .eq("cerrada", false)
    .order("fecha_inicio", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!gestion) {
    return NextResponse.json({ error: "No hay gestión activa" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("campanas")
    .insert({
      gestion_id: gestion.id,
      titulo: titulo.trim(),
      descripcion: descripcion ?? "",
      meta: metaNum,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "No se pudo crear la campaña" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, campana: data });
}
