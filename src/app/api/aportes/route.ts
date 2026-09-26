import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const db = supabaseAdmin();
import { sesionActual } from "@/lib/auth";
import { puedeAportar } from "@/lib/contabilidad";

export async function POST(req: NextRequest) {
  const sesion = await sesionActual();
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { campana_id, vecino_nombre, monto, comprobante_url } =
    await req.json().catch(() => ({}));

  if (typeof vecino_nombre !== "string" || !vecino_nombre.trim()) {
    return NextResponse.json({ error: "Escribe tu nombre" }, { status: 400 });
  }
  const montoNum = Number(monto);
  if (!(montoNum > 0)) {
    return NextResponse.json(
      { error: "El monto debe ser mayor a cero" },
      { status: 400 }
    );
  }

  const { data: campana } = await db
    .from("campanas")
    .select("id, estado, gestiones!inner(cerrada)")
    .eq("id", campana_id)
    .maybeSingle();
  if (!campana) {
    return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });
  }
  if (campana.estado !== "activa") {
    return NextResponse.json(
      { error: "La campaña ya está cerrada" },
      { status: 400 }
    );
  }
  // RF-8/RF-10: aportes congelados si la campaña o su gestión están cerradas
  const guardia = puedeAportar({
    estado: campana.estado,
    gestionCerrada: (campana.gestiones as unknown as { cerrada: boolean }).cerrada,
  });
  if (!guardia.permitido) {
    return NextResponse.json({ error: guardia.motivo }, { status: 409 });
  }

  const { error } = await db.from("aportes").insert({
    campana_id,
    vecino_nombre: vecino_nombre.trim(),
    monto: montoNum,
    comprobante_url: comprobante_url ?? null,
  });
  if (error) {
    return NextResponse.json({ error: "No se pudo registrar el aporte" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
