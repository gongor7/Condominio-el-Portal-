import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sesionActual } from "@/lib/auth";

const db = supabaseAdmin();

/** RF-2: listado público mínimo de multas impagas (casa, motivo, monto, fecha). Con ?id= devuelve el detalle (sesión). */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");

  if (id) {
    const sesion = await sesionActual();
    if (!sesion) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const { data } = await db
      .from("multas")
      .select("id, monto, motivo, estado, fecha, casas(numero, vecino_nombre)")
      .eq("id", id)
      .maybeSingle();
    if (!data) {
      return NextResponse.json({ error: "Multa no encontrada" }, { status: 404 });
    }
    return NextResponse.json({
      multa: {
        id: data.id,
        monto: Number(data.monto),
        motivo: data.motivo,
        estado: data.estado,
        fecha: data.fecha,
        casa: data.casas as unknown as { numero: number; vecino_nombre: string } | null,
      },
    });
  }

  const { data, error } = await db
    .from("multas")
    .select("monto, motivo, fecha, casas(numero, vecino_nombre)")
    .eq("estado", "impaga")
    .order("creado_en", { ascending: false });
  if (error) {
    return NextResponse.json({ error: "No se pudo cargar" }, { status: 500 });
  }
  const multas = (data ?? []).map((m) => ({
    casa: (m.casas as unknown as { numero: number })?.numero ?? null,
    vecino: (m.casas as unknown as { vecino_nombre: string })?.vecino_nombre ?? "",
    motivo: m.motivo,
    monto: Number(m.monto),
    fecha: m.fecha,
  }));
  return NextResponse.json({ multas });
}

/** RF-1: el responsable multa a una casa con motivo obligatorio. */
export async function POST(req: NextRequest) {
  const sesion = await sesionActual();
  if (!sesion || sesion.rol !== "responsable") {
    return NextResponse.json({ error: "Solo el responsable puede multar" }, { status: 403 });
  }
  const { casa_id, motivo, monto } = await req.json().catch(() => ({}));
  if (typeof casa_id !== "string" || !casa_id) {
    return NextResponse.json({ error: "Elige la casa" }, { status: 400 });
  }
  if (typeof motivo !== "string" || !motivo.trim()) {
    return NextResponse.json({ error: "El motivo es obligatorio" }, { status: 400 });
  }
  const montoNum = Number(monto);
  if (!Number.isFinite(montoNum) || montoNum <= 0) {
    return NextResponse.json({ error: "Monto inválido (> 0)" }, { status: 400 });
  }

  const { data: gestion } = await db
    .from("gestiones")
    .select("id")
    .eq("cerrada", false)
    .order("fecha_inicio", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!gestion) {
    return NextResponse.json({ error: "No hay gestión activa" }, { status: 400 });
  }

  const { data: multa, error } = await db
    .from("multas")
    .insert({
      gestion_id: gestion.id,
      casa_id,
      monto: montoNum,
      motivo: motivo.trim(),
    })
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: "No se pudo crear la multa" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, multa });
}
