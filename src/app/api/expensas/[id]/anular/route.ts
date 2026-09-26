import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sesionActual } from "@/lib/auth";

const db = supabaseAdmin();

/**
 * RF-14/RF-15: anulación auditable del pago completo (sin anulación parcial).
 * Libera meses (vigente=false) y anula ingresos; si la gestión original está
 * cerrada, registra egreso de ajuste en la gestión activa.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sesion = await sesionActual();
  if (!sesion || sesion.rol !== "responsable") {
    return NextResponse.json({ error: "Solo el responsable" }, { status: 403 });
  }
  const { id } = await params;
  const { motivo } = await req.json().catch(() => ({}));
  if (typeof motivo !== "string" || !motivo.trim()) {
    return NextResponse.json({ error: "El motivo es obligatorio" }, { status: 400 });
  }

  const { data: pago } = await db
    .from("pagos_expensas")
    .select("*, gestiones!inner(cerrada)")
    .eq("id", id)
    .maybeSingle();
  if (!pago) {
    return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
  }
  if (pago.estado === "anulado") {
    return NextResponse.json({ error: "Ya está anulado" }, { status: 409 });
  }

  // 1) Anular pago y liberar meses
  await db
    .from("pagos_expensas")
    .update({
      estado: "anulado",
      anulado_motivo: motivo.trim(),
      anulado_en: new Date().toISOString(),
    })
    .eq("id", id);
  await db.from("pagos_expensas_meses").update({ vigente: false }).eq("pago_id", id);

  // 2) Ajuste contable
  const gestionCerrada = (pago.gestiones as unknown as { cerrada: boolean }).cerrada;
  const { data: meses } = await db
    .from("pagos_expensas_meses")
    .select("mes, monto_mes, transaccion_id")
    .eq("pago_id", id);

  if (!gestionCerrada) {
    for (const m of meses ?? []) {
      if (m.transaccion_id) {
        await db
          .from("transacciones")
          .update({
            anulado: true,
            anulado_motivo: `Anulación expensa ${m.mes}: ${motivo.trim()}`,
            anulado_en: new Date().toISOString(),
          })
          .eq("id", m.transaccion_id);
      }
    }
  } else {
    // RF-15: gestión original inmutable → egreso de ajuste en la gestión activa
    const { data: activa } = await db
      .from("gestiones")
      .select("id")
      .eq("cerrada", false)
      .order("fecha_inicio", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (activa) {
      await db.from("transacciones").insert({
        gestion_id: activa.id,
        tipo: "egreso",
        monto: Number(pago.monto_total),
        categoria: "expensas",
        descripcion: `Devolución expensas (pago de gestión cerrada)`,
        fecha: new Date().toISOString().slice(0, 10),
        autor: "responsable",
      });
    }
  }

  return NextResponse.json({ ok: true });
}
