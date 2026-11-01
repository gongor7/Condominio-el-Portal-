import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sesionActual } from "@/lib/auth";

const db = supabaseAdmin();

function hoyLaPaz(): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/La_Paz",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const { year, month, day } = Object.fromEntries(
    fmt.formatToParts(new Date()).map((p) => [p.type, p.value])
  );
  return `${year}-${month}-${day}`;
}

/**
 * Spec-011: el responsable cierra la campaña (si está activa) y sube UN ingreso
 * consolidado al libro contable por el total recaudado, en la gestión activa.
 * Idempotente: si ya fue subida → 409.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sesion = await sesionActual();
  if (!sesion || sesion.rol !== "responsable") {
    return NextResponse.json({ error: "Solo el responsable" }, { status: 403 });
  }
  const { id } = await params;

  const { data: campana } = await db
    .from("campanas")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!campana) {
    return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });
  }
  if (campana.transaccion_id) {
    return NextResponse.json(
      { error: "Esta campaña ya está en el libro contable" },
      { status: 409 }
    );
  }

  // Total recaudado (aportes vigentes)
  const { data: aportes } = await db
    .from("aportes")
    .select("monto")
    .eq("campana_id", id)
    .eq("anulado", false);
  const total = (aportes ?? []).reduce((a, x) => a + Number(x.monto), 0);
  const n = (aportes ?? []).length;

  // Cerrar la campaña si sigue activa (el cierre congela aportes)
  if (campana.estado === "activa") {
    await db
      .from("campanas")
      .update({ estado: "cerrada", cerrada_en: new Date().toISOString() })
      .eq("id", id);
  }

  // Sin dinero recaudado: solo cierra, sin ingreso contable
  if (total <= 0) {
    return NextResponse.json({ ok: true, sin_ingreso: true });
  }

  const { data: gestion } = await db
    .from("gestiones")
    .select("id")
    .eq("cerrada", false)
    .order("fecha_inicio", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!gestion) {
    return NextResponse.json(
      { error: "No hay gestión activa para registrar el ingreso" },
      { status: 400 }
    );
  }

  const fecha = hoyLaPaz();
  const { data: transaccion, error } = await db
    .from("transacciones")
    .insert({
      gestion_id: gestion.id,
      tipo: "ingreso",
      monto: Math.round(total * 100) / 100,
      categoria: "pagos extraordinarios",
      descripcion: `Recaudación '${campana.titulo}': ${n} aporte${n === 1 ? "" : "s"}`,
      fecha,
      autor: "responsable",
    })
    .select("id, fecha")
    .single();
  if (error) {
    return NextResponse.json({ error: "No se pudo registrar el ingreso" }, { status: 500 });
  }

  await db
    .from("campanas")
    .update({ transaccion_id: transaccion.id })
    .eq("id", id);

  return NextResponse.json({
    ok: true,
    transaccion_id: transaccion.id,
    monto: Math.round(total * 100) / 100,
    mes: fecha.slice(0, 7),
  });
}
