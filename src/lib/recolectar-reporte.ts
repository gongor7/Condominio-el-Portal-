/** Recolecta todas las tablas para el reporte Excel (solo servidor). */
import { supabaseAdmin } from "./supabase";
import type { DatosReporte } from "./reporte-excel";

const db = supabaseAdmin();

export async function recolectarDatos(): Promise<DatosReporte> {
  const [
    gestiones,
    transacciones,
    casas,
    periodos,
    pagos,
    pagosMeses,
    multas,
    reservas,
    campanas,
    aportes,
    documentos,
  ] = await Promise.all([
    db.from("gestiones").select("*").order("fecha_inicio"),
    db.from("transacciones").select("*").order("fecha"),
    db.from("casas").select("id, numero, vecino_nombre, telefono, activo, creado_en").order("numero"),
    db.from("periodos_expensas").select("*").order("mes"),
    db.from("pagos_expensas").select("*").order("fecha_pago"),
    db.from("pagos_expensas_meses").select("*").order("mes"),
    db.from("multas").select("*").order("fecha"),
    db.from("reservas").select("*").order("fecha"),
    db.from("campanas").select("*").order("creado_en"),
    db.from("aportes").select("*").order("creado_en"),
    db.from("documentos").select("id, titulo, descripcion, categoria, creado_en"),
  ]);

  const sinError = (r: { data: Record<string, unknown>[] | null }) =>
    (r.data ?? []) as Record<string, unknown>[];

  return {
    generadoEn: new Date().toISOString(),
    gestiones: sinError(gestiones),
    transacciones: sinError(transacciones),
    casas: sinError(casas),
    periodos: sinError(periodos),
    pagos: sinError(pagos),
    pagosMeses: sinError(pagosMeses),
    multas: sinError(multas),
    reservas: sinError(reservas),
    campanas: sinError(campanas),
    aportes: sinError(aportes),
    documentos: sinError(documentos),
  };
}

const BUCKET_REPORTES = "reportes";

/** Guarda el snapshot diario en Storage; devuelve el nombre del archivo. */
export async function guardarSnapshot(): Promise<string> {
  const datos = await recolectarDatos();
  const buffer = await (await import("./reporte-excel")).generarWorkbook(datos);
  const nombre = (await import("./reporte-excel")).nombreSnapshot();
  await db.storage
    .from(BUCKET_REPORTES)
    .upload(nombre, buffer as unknown as Blob, {
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      upsert: true, // re-generar el mismo día lo reemplaza
    });
  return nombre;
}
