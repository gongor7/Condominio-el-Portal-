import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sesionActual } from "@/lib/auth";
import { validarTransaccion, puedeEscribirEnGestion } from "@/lib/contabilidad";

export async function POST(req: NextRequest) {
  const sesion = await sesionActual();
  if (!sesion || sesion.rol !== "responsable") {
    return NextResponse.json({ error: "Solo el responsable puede registrar" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const {
    tipo,
    monto,
    fecha,
    categoria,
    descripcion,
    comprobante_url,
    campana_id,
  } = body;

  const err = validarTransaccion({ tipo, monto, fecha });
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  // Gestión activa
  const { data: gestion } = await supabase
    .from("gestiones")
    .select("id, cerrada")
    .eq("cerrada", false)
    .order("fecha_inicio", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!gestion) {
    return NextResponse.json({ error: "No hay gestión activa" }, { status: 400 });
  }

  // RF-10: gestión cerrada es inmutable
  const guardia = puedeEscribirEnGestion({ cerrada: gestion.cerrada });
  if (!guardia.permitido) {
    return NextResponse.json({ error: guardia.motivo }, { status: 409 });
  }

  const { data: transaccion, error } = await supabase
    .from("transacciones")
    .insert({
      gestion_id: gestion.id,
      tipo,
      monto,
      fecha,
      categoria: categoria ?? "otros",
      descripcion: descripcion ?? "",
      comprobante_url: comprobante_url ?? null,
      autor: "responsable",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "No se pudo registrar" }, { status: 500 });
  }

  // Si el egreso corresponde a una campaña, registrarlo como gasto de campaña
  if (campana_id && tipo === "egreso") {
    await supabase.from("campana_gastos").insert({
      campana_id,
      transaccion_id: transaccion.id,
      monto,
      descripcion: descripcion ?? "",
      fecha,
      comprobante_url: comprobante_url ?? null,
    });
  }

  return NextResponse.json({ ok: true, transaccion });
}
