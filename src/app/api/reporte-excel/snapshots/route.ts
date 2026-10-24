import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sesionActual } from "@/lib/auth";
import { guardarSnapshot } from "@/lib/recolectar-reporte";

const db = supabaseAdmin();
const BUCKET = "reportes";

/** Lista los snapshots guardados (solo responsable). */
export async function GET() {
  const sesion = await sesionActual();
  if (!sesion || sesion.rol !== "responsable") {
    return NextResponse.json({ error: "Solo el responsable" }, { status: 403 });
  }
  const { data, error } = await db.storage.from(BUCKET).list(undefined, {
    limit: 100,
    sortBy: { column: "created_at", order: "desc" },
  });
  if (error) {
    return NextResponse.json({ error: "No se pudo listar" }, { status: 500 });
  }
  const snapshots = (data ?? [])
    .filter((f) => f.name.endsWith(".xlsx"))
    .map((f) => ({
      nombre: f.name,
      tamano_kb: Math.round((f.metadata?.size ?? 0) / 1024),
      creado: f.created_at,
    }));
  return NextResponse.json({ snapshots });
}

/** Genera y guarda un snapshot ahora (botón del responsable). */
export async function POST() {
  const sesion = await sesionActual();
  if (!sesion || sesion.rol !== "responsable") {
    return NextResponse.json({ error: "Solo el responsable" }, { status: 403 });
  }
  try {
    const nombre = await guardarSnapshot();
    return NextResponse.json({ ok: true, nombre });
  } catch {
    return NextResponse.json({ error: "No se pudo generar el snapshot" }, { status: 500 });
  }
}

/** Descarga un snapshot por nombre (solo responsable). */
export async function PUT(req: NextRequest) {
  const sesion = await sesionActual();
  if (!sesion || sesion.rol !== "responsable") {
    return NextResponse.json({ error: "Solo el responsable" }, { status: 403 });
  }
  const { nombre } = await req.json().catch(() => ({}));
  if (typeof nombre !== "string" || !/^reporte-\d{4}-\d{2}-\d{2}\.xlsx$/.test(nombre)) {
    return NextResponse.json({ error: "Nombre inválido" }, { status: 400 });
  }
  const { data, error } = await db.storage.from(BUCKET).download(nombre);
  if (error || !data) {
    return NextResponse.json({ error: "Snapshot no encontrado" }, { status: 404 });
  }
  const buffer = Buffer.from(await data.arrayBuffer());
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nombre}"`,
      "Cache-Control": "no-store",
    },
  });
}
