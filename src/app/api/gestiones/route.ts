import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sesionActual } from "@/lib/auth";
import { esFechaValida } from "@/lib/salon";

const db = supabaseAdmin();

/** Crear una nueva gestión (solo responsable, solo si no hay activa). */
export async function POST(req: NextRequest) {
  const sesion = await sesionActual();
  if (!sesion || sesion.rol !== "responsable") {
    return NextResponse.json({ error: "Solo el responsable" }, { status: 403 });
  }

  const { nombre, responsable_nombre, casa_id, fecha_inicio, saldo_inicial } =
    await req.json().catch(() => ({}));

  if (typeof nombre !== "string" || !nombre.trim()) {
    return NextResponse.json({ error: "Falta el nombre de la gestión" }, { status: 400 });
  }
  if (!esFechaValida(String(fecha_inicio ?? ""))) {
    return NextResponse.json({ error: "Fecha de inicio inválida" }, { status: 400 });
  }

  // Responsable: casa de la lista (con snapshot de nombre) o nombre libre
  let respNombre = typeof responsable_nombre === "string" ? responsable_nombre.trim() : "";
  let respCasa = "";
  if (typeof casa_id === "string" && casa_id) {
    const { data: casa } = await db
      .from("casas")
      .select("numero, vecino_nombre")
      .eq("id", casa_id)
      .maybeSingle();
    if (!casa) {
      return NextResponse.json({ error: "Casa inválida" }, { status: 400 });
    }
    respNombre = casa.vecino_nombre;
    respCasa = `Casa ${casa.numero}`;
  }
  if (!respNombre) {
    return NextResponse.json(
      { error: "Indica quién será el responsable (elige su casa)" },
      { status: 400 }
    );
  }

  const { count: activas } = await db
    .from("gestiones")
    .select("id", { count: "exact", head: true })
    .eq("cerrada", false);
  if ((activas ?? 0) > 0) {
    return NextResponse.json(
      { error: "Ya hay una gestión activa; ciérrala antes de crear otra" },
      { status: 409 }
    );
  }

  const saldoInicial = Number(saldo_inicial);
  const { data: gestion, error } = await db
    .from("gestiones")
    .insert({
      nombre: nombre.trim(),
      responsable_nombre: respNombre,
      responsable_casa: respCasa,
      fecha_inicio,
      saldo_inicial: Number.isFinite(saldoInicial) && saldoInicial > 0 ? saldoInicial : 0,
    })
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: "No se pudo crear la gestión" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, gestion });
}
