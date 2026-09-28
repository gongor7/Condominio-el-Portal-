import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sesionActual } from "@/lib/auth";

const db = supabaseAdmin();

/** RF-4: anulación auditable; si estaba pagada, egreso de ajuste (gestión activa si la original cerró). */
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

  const { data: multa } = await db
    .from("multas")
    .select("*, gestiones!inner(cerrada)")
    .eq("id", id)
    .maybeSingle();
  if (!multa) {
    return NextResponse.json({ error: "Multa no encontrada" }, { status: 404 });
  }
  if (multa.estado === "anulada") {
    return NextResponse.json({ error: "Ya está anulada" }, { status: 409 });
  }

  // Anular multa
  await db
    .from("multas")
    .update({
      estado: "anulada",
      anulado_motivo: motivo.trim(),
      anulado_en: new Date().toISOString(),
    })
    .eq("id", id);

  // Si estaba pagada: devolver el dinero en el libro
  if (multa.estado === "pagada" && multa.transaccion_id) {
    const gestionCerrada = (multa.gestiones as unknown as { cerrada: boolean }).cerrada;
    if (!gestionCerrada) {
      await db
        .from("transacciones")
        .update({
          anulado: true,
          anulado_motivo: `Anulación de multa: ${motivo.trim()}`,
          anulado_en: new Date().toISOString(),
        })
        .eq("id", multa.transaccion_id);
    } else {
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
          monto: Number(multa.monto),
          categoria: "multas",
          descripcion: `Devolución de multa anulada (${motivo.trim().slice(0, 40)})`,
          fecha: new Date().toISOString().slice(0, 10),
          autor: "responsable",
        });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
