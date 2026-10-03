import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sesionActual } from "@/lib/auth";
import { esFechaValida } from "@/lib/salon";

const db = supabaseAdmin();

/** RF-3: el responsable define/actualiza el monto de un mes. */
export async function POST(req: NextRequest) {
  const sesion = await sesionActual();
  if (!sesion || sesion.rol !== "responsable") {
    return NextResponse.json({ error: "Solo el responsable" }, { status: 403 });
  }

  const { mes, monto, confirmar, fecha_limite } = await req.json().catch(() => ({}));
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(mes ?? ""))) {
    return NextResponse.json({ error: "Mes inválido (yyyy-mm)" }, { status: 400 });
  }
  const fechaLimite = typeof fecha_limite === "string" && fecha_limite ? fecha_limite : null;
  if (fechaLimite && !esFechaValida(fechaLimite)) {
    return NextResponse.json({ error: "Fecha límite inválida (yyyy-mm-dd)" }, { status: 400 });
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

  // RF-5: si ya hay pagos con otro monto, exigir confirmación explícita
  const { data: existente } = await db
    .from("periodos_expensas")
    .select("id, monto")
    .eq("gestion_id", gestion.id)
    .eq("mes", mes)
    .maybeSingle();

  if (existente && Number(existente.monto) !== montoNum) {
    const { count } = await db
      .from("pagos_expensas_meses")
      .select("id", { count: "exact", head: true })
      .eq("mes", mes)
      .eq("vigente", true);
    if ((count ?? 0) > 0 && !confirmar) {
      return NextResponse.json(
        {
          error:
            "Ese mes ya tiene pagos registrados; los pagos existentes NO se recalculan. Envía confirmar: true para cambiar el monto de todos modos.",
        },
        { status: 409 }
      );
    }
  }

  const { error } = existente
    ? await db
        .from("periodos_expensas")
        .update({ monto: montoNum, fecha_limite: fechaLimite })
        .eq("id", existente.id)
    : await db
        .from("periodos_expensas")
        .insert({ gestion_id: gestion.id, mes, monto: montoNum, fecha_limite: fechaLimite });

  if (error) {
    return NextResponse.json({ error: "No se pudo guardar el período" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
