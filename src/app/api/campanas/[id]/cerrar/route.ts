import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const db = supabaseAdmin();
import { sesionActual } from "@/lib/auth";
import { resumenCampana } from "@/lib/contabilidad";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sesion = await sesionActual();
  if (!sesion || sesion.rol !== "responsable") {
    return NextResponse.json(
      { error: "Solo el responsable puede cerrar el pago extraordinario" },
      { status: 403 }
    );
  }
  const { id } = await params;

  const { data: campana } = await db
    .from("campanas")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!campana) {
    return NextResponse.json({ error: "Pago extraordinario no encontrado" }, { status: 404 });
  }
  if (campana.estado === "cerrada") {
    return NextResponse.json({ error: "Ya está cerrada" }, { status: 409 });
  }

  // El cierre con cualquier saldo es válido; se devuelve el veredicto final
  const [{ data: aportes }, { data: gastos }] = await Promise.all([
    db.from("aportes").select("monto, anulado").eq("campana_id", id),
    db.from("campana_gastos").select("monto, anulado").eq("campana_id", id),
  ]);
  const resumen = resumenCampana({
    meta: campana.meta !== null ? Number(campana.meta) : null,
    estado: "cerrada",
    aportes: (aportes ?? []).filter((a) => !a.anulado).map((a) => Number(a.monto)),
    gastos: (gastos ?? []).filter((g) => !g.anulado).map((g) => Number(g.monto)),
  });

  const { error } = await db
    .from("campanas")
    .update({ estado: "cerrada", cerrada_en: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    return NextResponse.json({ error: "No se pudo cerrar el pago extraordinario" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, resumen });
}
