import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sesionActual } from "@/lib/auth";
import { esFechaValida, mesActualAmericaLaPaz } from "@/lib/salon";

const db = supabaseAdmin();

/**
 * RF-1: sin sesión devuelve solo las fechas ocupadas del mes (sin datos personales).
 * RF-2: con sesión devuelve el detalle de cada reserva del mes.
 */
export async function GET(req: NextRequest) {
  const mesParam = req.nextUrl.searchParams.get("mes") ?? mesActualAmericaLaPaz();
  if (!/^\d{4}-\d{2}$/.test(mesParam) || !esFechaValida(`${mesParam}-01`)) {
    return NextResponse.json({ error: "Mes inválido (yyyy-mm)" }, { status: 400 });
  }

  const [anio, mes] = mesParam.split("-").map(Number);
  const desde = `${anio}-${String(mes).padStart(2, "0")}-01`;
  const hasta = new Date(Date.UTC(mes === 12 ? anio + 1 : anio, mes === 12 ? 0 : mes, 1))
    .toISOString()
    .slice(0, 10);

  const { data: reservas, error } = await db
    .from("reservas")
    .select(
      "id, fecha, vecino_nombre, vecino_casa, monto, descripcion, estado, comprobante_url"
    )
    .gte("fecha", desde)
    .lt("fecha", hasta)
    .order("fecha");
  if (error) {
    return NextResponse.json({ error: "No se pudo cargar el calendario" }, { status: 500 });
  }

  const sesion = await sesionActual();
  if (!sesion) {
    // RF-1: visitante sin sesión — solo ocupación, sin nombres
    const ocupadas = (reservas ?? [])
      .filter((r) => r.estado === "vigente")
      .map((r) => r.fecha);
    return NextResponse.json({ mes: mesParam, ocupadas });
  }

  return NextResponse.json({ mes: mesParam, reservas: reservas ?? [] });
}
