import { NextRequest, NextResponse } from "next/server";
import { guardarSnapshot } from "@/lib/recolectar-reporte";

/**
 * Cron diario de Vercel (vercel.json): genera el snapshot Excel y lo guarda
 * en Storage. Protegido con CRON_SECRET (Vercel envía Authorization: Bearer).
 * En local también acepta ?secret= para probar.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const secret = process.env.CRON_SECRET;
  const viaQuery = req.nextUrl.searchParams.get("secret");
  const autorizado =
    (secret && auth === `Bearer ${secret}`) ||
    (secret && viaQuery === secret);

  if (!autorizado) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const nombre = await guardarSnapshot();
    return NextResponse.json({ ok: true, nombre, generado: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json(
      { error: "Fallo generando el snapshot", detalle: String(e).slice(0, 200) },
      { status: 500 }
    );
  }
}
