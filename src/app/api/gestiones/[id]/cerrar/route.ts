import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

import { sesionActual } from "@/lib/auth";
import { puedeCerrarGestion, saldoGestion } from "@/lib/contabilidad";

const db = supabaseAdmin();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sesion = await sesionActual();
  if (!sesion || sesion.rol !== "responsable") {
    return NextResponse.json(
      { error: "Solo el responsable puede cerrar la gestión" },
      { status: 403 }
    );
  }
  const { id } = await params;
  const { nota, cerrar_campanas } = await req.json().catch(() => ({
    nota: null,
    cerrar_campanas: false,
  }));

  const { data: gestion } = await db
    .from("gestiones")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!gestion) {
    return NextResponse.json({ error: "Gestión no encontrada" }, { status: 404 });
  }
  if (gestion.cerrada) {
    return NextResponse.json(
      { error: "La gestión ya está cerrada" },
      { status: 409 }
    );
  }

  // Campañas activas de esta gestión bloquean el cierre (RF-10)
  const { count: campanasActivas } = await db
    .from("campanas")
    .select("id", { count: "exact", head: true })
    .eq("gestion_id", id)
    .eq("estado", "activa");

  // Saldo pendiente: queda como aviso, no bloquea
  const { data: transacciones } = await db
    .from("transacciones")
    .select("tipo, monto, anulado")
    .eq("gestion_id", id);
  const saldoPendiente = saldoGestion(
    (transacciones ?? []).map((t) => ({
      tipo: t.tipo,
      monto: Number(t.monto),
      anulado: t.anulado,
    })),
    Number(gestion.saldo_inicial ?? 0)
  );

  const resultado = puedeCerrarGestion({
    campanasActivas: cerrar_campanas ? 0 : (campanasActivas ?? 0),
    saldoPendiente,
  });
  if (!resultado.puedeCerrar) {
    return NextResponse.json(
      { error: resultado.bloqueos.join(" "), avisos: resultado.avisos },
      { status: 409 }
    );
  }

  // Cerrar en lote las campañas activas si el responsable lo confirmó
  if (cerrar_campanas && (campanasActivas ?? 0) > 0) {
    await db
      .from("campanas")
      .update({ estado: "cerrada", cerrada_en: new Date().toISOString() })
      .eq("gestion_id", id)
      .eq("estado", "activa");
  }

  const { error } = await db
    .from("gestiones")
    .update({
      cerrada: true,
      fecha_cierre: new Date().toISOString().slice(0, 10),
      cierre_nota: typeof nota === "string" && nota.trim() ? nota.trim() : null,
    })
    .eq("id", id);
  if (error) {
    return NextResponse.json({ error: "No se pudo cerrar la gestión" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, avisos: resultado.avisos });
}
