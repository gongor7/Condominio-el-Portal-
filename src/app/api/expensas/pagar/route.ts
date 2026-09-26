import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sesionActual } from "@/lib/auth";
import { mesesPagables, totalEsperado, repartoMontos } from "@/lib/expensas";

const db = supabaseAdmin();

function mesActualLaPaz(): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/La_Paz",
    year: "numeric",
    month: "2-digit",
  });
  const { year, month } = Object.fromEntries(
    fmt.formatToParts(new Date()).map((p) => [p.type, p.value])
  );
  return `${year}-${month}`;
}

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

/** RF-7/8/10: pago de expensas por vecino (o responsable), con revalidación server-side. */
export async function POST(req: NextRequest) {
  const sesion = await sesionActual();
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { casa_id, meses, monto, comprobante_url, ocr_descartado, confirmar_diferencia } =
    await req.json().catch(() => ({}));

  if (!Array.isArray(meses) || meses.length === 0) {
    return NextResponse.json({ error: "Elige al menos un mes" }, { status: 400 });
  }
  const montoNum = Number(monto);
  if (!Number.isFinite(montoNum) || montoNum <= 0) {
    return NextResponse.json({ error: "Monto inválido" }, { status: 400 });
  }
  if (typeof comprobante_url !== "string") {
    return NextResponse.json({ error: "Sube el comprobante del pago" }, { status: 400 });
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

  // Casa válida y activa
  const { data: casa } = await db
    .from("casas")
    .select("id, activo")
    .eq("id", casa_id)
    .maybeSingle();
  if (!casa || !casa.activo) {
    return NextResponse.json({ error: "Casa inválida" }, { status: 400 });
  }

  // Revalidar meses pagables en el servidor (RF-7: nunca futuros, sin pagar, con período)
  const { data: periodosData } = await db
    .from("periodos_expensas")
    .select("mes, monto")
    .eq("gestion_id", gestion.id);
  const periodos = (periodosData ?? []).map((p) => ({ mes: p.mes, monto: Number(p.monto) }));

  const { data: pagosData } = await db
    .from("pagos_expensas_meses")
    .select("mes")
    .eq("casa_id", casa_id)
    .eq("vigente", true)
    .in("mes", meses);
  const yaPagados = (pagosData ?? []).map((p) => p.mes);

  const permitidos = mesesPagables(mesActualLaPaz(), periodos, yaPagados);
  const invalidos = meses.filter((m: string) => !permitidos.includes(m));
  if (invalidos.length > 0) {
    return NextResponse.json(
      { error: `Meses no pagables (futuros, sin período o ya pagados): ${invalidos.join(", ")}` },
      { status: 400 }
    );
  }

  // Revalidar monto contra total esperado (RF-9)
  const esperado = totalEsperado(meses, periodos);
  if (esperado !== null && Math.abs(esperado - montoNum) > 0.01 && !confirmar_diferencia) {
    return NextResponse.json(
      { error: `El total esperado es ${esperado} Bs; confirma la diferencia para continuar` },
      { status: 400 }
    );
  }
  if (ocr_descartado !== true && ocr_descartado !== false && ocr_descartado !== undefined) {
    return NextResponse.json({ error: "ocr_descartado inválido" }, { status: 400 });
  }

  // Reparto: cada mes su monto, el último absorbe la diferencia (RF-10/RF-11)
  const reparto = repartoMontos(montoNum, meses, periodos);

  const { data: pago, error } = await db.rpc("registrar_pago_expensas", {
    p_gestion_id: gestion.id,
    p_casa_id: casa_id,
    p_meses: reparto.map((r) => r.mes),
    p_montos_mes: reparto.map((r) => r.monto_mes),
    p_monto_total: montoNum,
    p_comprobante_url: comprobante_url,
    p_fecha_pago: hoyLaPaz(),
  });

  if (error) {
    if (/mes ya pagado/.test(error.message)) {
      return NextResponse.json(
        { error: "Ese mes ya está pagado por tu casa" },
        { status: 409 }
      );
    }
    if (/mes sin periodo/.test(error.message)) {
      return NextResponse.json(
        { error: "Algún mes no tiene período definido" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "No se pudo registrar el pago" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, pago });
}
