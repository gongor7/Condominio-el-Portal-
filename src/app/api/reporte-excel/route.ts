import { NextResponse } from "next/server";
import { sesionActual } from "@/lib/auth";
import { recolectarDatos } from "@/lib/recolectar-reporte";
import { generarWorkbook, nombreSnapshot } from "@/lib/reporte-excel";

/** Descarga inmediata del reporte Excel completo (solo responsable). */
export async function GET() {
  const sesion = await sesionActual();
  if (!sesion || sesion.rol !== "responsable") {
    return NextResponse.json({ error: "Solo el responsable" }, { status: 403 });
  }
  const datos = await recolectarDatos();
  const buffer = await generarWorkbook(datos);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nombreSnapshot()}"`,
      "Cache-Control": "no-store",
    },
  });
}
