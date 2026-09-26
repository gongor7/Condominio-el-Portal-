import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sesionActual } from "@/lib/auth";

const db = supabaseAdmin();

/**
 * RF-8: anulación auditable con tipo:
 * - devolucion: anula el ingreso contable enlazado (gestión abierta)
 *   o registra el egreso de devolución en la gestión activa si la original está cerrada (RF-9).
 * - retencion: el ingreso queda vigente.
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
  const { motivo, tipo } = await req.json().catch(() => ({}));

  if (typeof motivo !== "string" || !motivo.trim()) {
    return NextResponse.json({ error: "El motivo es obligatorio" }, { status: 400 });
  }
  if (tipo !== "devolucion" && tipo !== "retencion") {
    return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
  }

  const { data: reserva } = await db
    .from("reservas")
    .select("*, gestiones!inner(cerrada, nombre)")
    .eq("id", id)
    .maybeSingle();
  if (!reserva) {
    return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
  }
  if (reserva.estado === "anulada") {
    return NextResponse.json({ error: "Ya está anulada" }, { status: 409 });
  }

  // 1) Marcar la reserva anulada (libera la fecha vía índice parcial)
  const { error: errAnular } = await db
    .from("reservas")
    .update({
      estado: "anulada",
      anulado_motivo: motivo.trim(),
      anulado_tipo: tipo,
      anulado_en: new Date().toISOString(),
    })
    .eq("id", id);
  if (errAnular) {
    return NextResponse.json({ error: "No se pudo anular" }, { status: 500 });
  }

  // 2) Ajuste contable según tipo (solo reservas pagadas)
  if (tipo === "devolucion" && reserva.transaccion_id) {
    const gestionOriginalCerrada = (
      reserva.gestiones as unknown as { cerrada: boolean }
    ).cerrada;

    if (!gestionOriginalCerrada) {
      // Caso normal: anular el ingreso enlazado
      await db
        .from("transacciones")
        .update({
          anulado: true,
          anulado_motivo: `Devolución reserva salón ${reserva.fecha}: ${motivo.trim()}`,
          anulado_en: new Date().toISOString(),
        })
        .eq("id", reserva.transaccion_id);
    } else {
      // RF-9: gestión original inmutable → egreso de devolución en la gestión activa
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
          monto: Number(reserva.monto),
          categoria: "alquiler salón",
          descripcion: `Devolución de reserva (${reserva.fecha}) de gestión cerrada`,
          fecha: new Date().toISOString().slice(0, 10),
          autor: "responsable",
        });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
