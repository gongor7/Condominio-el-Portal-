import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sesionActual } from "@/lib/auth";
import { esFechaValida, fechaDisponible, hoyAmericaLaPaz } from "@/lib/salon";
import { deudasCasa, type MesDeuda } from "@/lib/deudas";

const db = supabaseAdmin();

/** RF-3/4/5/8/9: crea reservas 'casa' (pagada, sin deudas) o 'todos' (comunitaria). */
export async function POST(req: NextRequest) {
  const sesion = await sesionActual();
  if (!sesion || sesion.rol !== "responsable") {
    return NextResponse.json({ error: "Solo el responsable puede reservar" }, { status: 403 });
  }

  const {
    fecha,
    monto,
    descripcion,
    comprobante_url,
    casa_id,
    modalidad,
  } = await req.json().catch(() => ({}));

  const esTodos = modalidad === "todos";

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

  if (esTodos) {
    // RF-9: comunitaria — sin casa, sin monto, sin ingreso, sin bloqueos
    const { data: reserva, error } = await db.rpc("crear_reserva_con_ingreso", {
      p_gestion_id: gestion.id,
      p_fecha: fecha,
      p_vecino_nombre: "Todos los vecinos",
      p_vecino_casa: "",
      p_monto: 0,
      p_descripcion: typeof descripcion === "string" ? descripcion.trim() : "",
      p_comprobante_url: null,
      p_casa_id: null,
      p_modalidad: "todos",
    });
    if (error) {
      return NextResponse.json({ error: "No se pudo crear la reserva" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, reserva });
  }

  // ---- Modalidad 'casa' ----
  if (typeof casa_id !== "string" || !casa_id) {
    return NextResponse.json({ error: "Elige la casa que reserva" }, { status: 400 });
  }
  const montoNum = Number(monto);
  if (!Number.isFinite(montoNum) || montoNum <= 0) {
    return NextResponse.json(
      { error: "Las reservas de casa exigen monto mayor a cero (RF-8)" },
      { status: 400 }
    );
  }
  if (typeof comprobante_url !== "string" || !comprobante_url) {
    return NextResponse.json(
      { error: "Sube el comprobante del pago" },
      { status: 400 }
    );
  }

  const { data: casa } = await db
    .from("casas")
    .select("id, numero, vecino_nombre")
    .eq("id", casa_id)
    .maybeSingle();
  if (!casa) {
    return NextResponse.json({ error: "Casa inválida" }, { status: 400 });
  }

  // RF-5: bloqueo por deudas — multas impagas (cualquier gestión) y expensas vencidas
  const [{ data: multas }, { data: periodos }] = await Promise.all([
    db.from("multas").select("casa_id, monto, motivo, estado").eq("casa_id", casa_id).eq("estado", "impaga"),
    db.from("periodos_expensas").select("mes, monto, fecha_limite").eq("gestion_id", gestion.id),
  ]);

  const { data: pagosCasa } = await db
    .from("pagos_expensas_meses")
    .select("mes, vigente, pagos_expensas(fecha_pago)")
    .eq("casa_id", casa_id);

  const pagadoPorMes = new Map<string, string>();
  for (const pm of pagosCasa ?? []) {
    if (pm.vigente) {
      const fp = (pm.pagos_expensas as unknown as { fecha_pago?: string } | null)?.fecha_pago;
      if (fp) pagadoPorMes.set(pm.mes, fp);
    }
  }

  const meses: MesDeuda[] = (periodos ?? []).map((p) => ({
    mes: p.mes,
    monto: Number(p.monto),
    fechaLimite: p.fecha_limite ?? null,
    pagadoEnFecha: pagadoPorMes.get(p.mes) ?? null,
  }));

  const deuda = deudasCasa({
    casaId: casa_id,
    multas: (multas ?? []).map((m) => ({
      casa_id: m.casa_id,
      monto: Number(m.monto),
      motivo: m.motivo,
      estado: "impaga",
    })),
    meses,
    hoy,
  });
  if (deuda.bloqueada) {
    return NextResponse.json(
      { error: `No se puede reservar: ${deuda.motivos.join("; ")}` },
      { status: 409 }
    );
  }

  const { data: reserva, error } = await db.rpc("crear_reserva_con_ingreso", {
    p_gestion_id: gestion.id,
    p_fecha: fecha,
    p_vecino_nombre: casa.vecino_nombre,
    p_vecino_casa: `Casa ${casa.numero}`,
    p_monto: montoNum,
    p_descripcion: typeof descripcion === "string" ? descripcion.trim() : "",
    p_comprobante_url: comprobante_url,
    p_casa_id: casa_id,
    p_modalidad: "casa",
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
