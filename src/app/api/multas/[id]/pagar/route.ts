import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sesionActual } from "@/lib/auth";
import { montoCompleto } from "@/lib/deudas";

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

/** RF-3: el vecino paga su multa completa con comprobante adjunto. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sesion = await sesionActual();
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const { comprobante_url, monto } = await req.json().catch(() => ({}));

  if (typeof comprobante_url !== "string" || !comprobante_url) {
    return NextResponse.json({ error: "Sube el comprobante del pago" }, { status: 400 });
  }
  const montoNum = Number(monto);
  if (!Number.isFinite(montoNum) || montoNum <= 0) {
    return NextResponse.json({ error: "Monto inválido" }, { status: 400 });
  }

  const { data: multa } = await db
    .from("multas")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!multa) {
    return NextResponse.json({ error: "Multa no encontrada" }, { status: 404 });
  }
  if (multa.estado !== "impaga") {
    return NextResponse.json({ error: "La multa no está impaga" }, { status: 409 });
  }

  // RF-3: revalidación server-side del monto completo
  if (!montoCompleto(montoNum, Number(multa.monto))) {
    return NextResponse.json(
      {
        error: `Pago incompleto: la multa es ${Number(multa.monto)} Bs y enviaste ${montoNum} Bs`,
      },
      { status: 400 }
    );
  }

  // Las multas persisten entre gestiones: el ingreso va a la gestión activa
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

  const { data: pagada, error } = await db.rpc("pagar_multa", {
    p_multa_id: id,
    p_gestion_id: gestion.id,
    p_comprobante_url: comprobante_url,
    p_fecha_pago: hoyLaPaz(),
    p_monto: montoNum,
  });
  if (error) {
    if (/pago incompleto/.test(error.message)) {
      return NextResponse.json({ error: "Pago incompleto" }, { status: 400 });
    }
    return NextResponse.json({ error: "No se pudo registrar el pago" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, multa: pagada });
}
