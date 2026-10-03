import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sesionActual } from "@/lib/auth";
import { estadoMes } from "@/lib/deudas";
import { hoyAmericaLaPaz } from "@/lib/salon";

const db = supabaseAdmin();

/** Checklist de pendientes antes de cerrar la gestión activa. */
export async function GET() {
  const sesion = await sesionActual();
  if (!sesion || sesion.rol !== "responsable") {
    return NextResponse.json({ error: "Solo el responsable" }, { status: 403 });
  }

  const { data: gestion } = await db
    .from("gestiones")
    .select("id")
    .eq("cerrada", false)
    .order("fecha_inicio", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!gestion) {
    return NextResponse.json({ error: "No hay gestión activa" }, { status: 404 });
  }

  const [{ count: campanasActivas }, { data: multasImpagas }, { data: periodos }, { data: pagosMes }] =
    await Promise.all([
      db.from("campanas").select("id", { count: "exact", head: true }).eq("gestion_id", gestion.id).eq("estado", "activa"),
      db.from("multas").select("monto").eq("estado", "impaga"),
      db.from("periodos_expensas").select("mes, fecha_limite").eq("gestion_id", gestion.id),
      db.from("pagos_expensas_meses").select("casa_id, mes").eq("vigente", true),
    ]);

  const hoy = hoyAmericaLaPaz();
  const { count: casasN } = await db
    .from("casas")
    .select("id", { count: "exact", head: true })
    .eq("activo", true);

  let expensasVencidas = 0;
  for (const p of periodos ?? []) {
    if (!p.fecha_limite) continue;
    if (estadoMes({ mes: p.mes, fechaLimite: p.fecha_limite, pagadoEnFecha: null, hoy }) === "vencido") {
      const pagaron = (pagosMes ?? []).filter((x) => x.mes === p.mes).length;
      expensasVencidas += Math.max(0, (casasN ?? 0) - pagaron);
    }
  }

  return NextResponse.json({
    campanasActivas: campanasActivas ?? 0,
    multasImpagas: (multasImpagas ?? []).length,
    multasTotal: (multasImpagas ?? []).reduce((a, m) => a + Number(m.monto), 0),
    expensasVencidas,
  });
}
