import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sesionActual } from "@/lib/auth";

const db = supabaseAdmin();

/** RF-12: datos de la grilla de expensas (sesión requerida). */
export async function GET() {
  const sesion = await sesionActual();
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { data: gestion } = await db
    .from("gestiones")
    .select("id")
    .eq("cerrada", false)
    .order("fecha_inicio", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: casas } = await db
    .from("casas")
    .select("id, numero, vecino_nombre, telefono")
    .eq("activo", true)
    .order("numero");
  if (!gestion) {
    return NextResponse.json({ casas: casas ?? [], periodos: [], pagos: [] });
  }

  const [{ data: periodos }, { data: pagos }] = await Promise.all([
    db
      .from("periodos_expensas")
      .select("id, mes, monto, fecha_limite")
      .eq("gestion_id", gestion.id)
      .order("mes"),
    db
      .from("pagos_expensas")
      .select(
        "id, casa_id, monto_total, comprobante_url, fecha_pago, estado, pagos_expensas_meses(pago_id, casa_id, mes, monto_mes, vigente)"
      )
      .eq("gestion_id", gestion.id)
      .order("creado_en", { ascending: false }),
  ]);

  return NextResponse.json({
    casas: casas ?? [],
    periodos: (periodos ?? []).map((p) => ({ ...p, monto: Number(p.monto) })),
    pagos: pagos ?? [],
  });
}
