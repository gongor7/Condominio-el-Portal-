import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sesionActual } from "@/lib/auth";
import { esFechaValida, fechaDisponible, hoyAmericaLaPaz } from "@/lib/salon";

const db = supabaseAdmin();

/** RF-3/4/5/6: crea la reserva vía RPC transaccional. */
export async function POST(req: NextRequest) {
  const sesion = await sesionActual();
  if (!sesion || sesion.rol !== "responsable") {
    return NextResponse.json({ error: "Solo el responsable puede reservar" }, { status: 403 });
  }

  const { fecha, vecino_nombre, vecino_casa, monto, descripcion, comprobante_url } =
    await req.json().catch(() => ({}));

  if (!esFechaValida(String(fecha ?? ""))) {
    return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
  }
  const hoy = hoyAmericaLaPaz();
  if (fecha < hoy) {
    return NextResponse.json(
      { error: "No se puede reservar una fecha pasada" },
      { status: 400 }
    );
  }
  if (typeof vecino_nombre !== "string" || !vecino_nombre.trim()) {
    return NextResponse.json({ error: "Falta el nombre del vecino" }, { status: 400 });
  }
  const montoNum = Number(monto);
  if (!Number.isFinite(montoNum) || montoNum < 0) {
    return NextResponse.json({ error: "Monto inválido (≥ 0)" }, { status: 400 });
  }
  // RF-5: toda reserva con costo exige comprobante
  if (montoNum > 0 && typeof comprobante_url !== "string") {
    return NextResponse.json(
      { error: "Sube el comprobante del pago (o usa monto 0 si es gratuita)" },
      { status: 400 }
    );
  }

  const { data: gestion } = await db
    .from("gestiones")
    .select("id, cerrada")
    .eq("cerrada", false)
    .order("fecha_inicio", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!gestion) {
    return NextResponse.json({ error: "No hay gestión activa" }, { status: 400 });
  }

  // Chequeo temprano de disponibilidad (la unicidad real la garantiza el índice)
  const { data: ocupadas } = await db
    .from("reservas")
    .select("fecha")
    .eq("fecha", fecha)
    .eq("estado", "vigente");
  if (!fechaDisponible(fecha, (ocupadas ?? []).map((r) => r.fecha), hoy)) {
    return NextResponse.json(
      { error: "Esa fecha ya está reservada" },
      { status: 409 }
    );
  }

  const { data: reserva, error } = await db.rpc("crear_reserva_con_ingreso", {
    p_gestion_id: gestion.id,
    p_fecha: fecha,
    p_vecino_nombre: vecino_nombre.trim(),
    p_vecino_casa: typeof vecino_casa === "string" ? vecino_casa.trim() : "",
    p_monto: montoNum,
    p_descripcion: typeof descripcion === "string" ? descripcion.trim() : "",
    p_comprobante_url: montoNum > 0 ? comprobante_url : null,
  });

  if (error) {
    if (error.code === "23505" || /uq_reservas_fecha_vigente/.test(error.message)) {
      return NextResponse.json(
        { error: "Esa fecha acaba de ser reservada por otra gestión" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "No se pudo crear la reserva" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, reserva });
}
