import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sesionActual } from "@/lib/auth";
import { esFechaValida } from "@/lib/salon";
import { validarTransaccion } from "@/lib/contabilidad";

const db = supabaseAdmin();

/** Categorías creadas por otros módulos: se corrigen desde su módulo (RF-9). */
const RESERVADAS: Record<string, string> = {
  expensas: "Expensa",
  multas: "Multa",
  "alquiler salón": "Salón",
};

const CAMPOS_EDITABLES = ["monto", "fecha", "categoria", "descripcion", "comprobante_url"] as const;

/**
 * RF-2/RF-3: el responsable edita un movimiento con motivo obligatorio.
 * Guarda el historial campo por campo y sincroniza el gasto de campaña (RF-8).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sesion = await sesionActual();
  if (!sesion || sesion.rol !== "responsable") {
    return NextResponse.json(
      { error: "Solo el responsable puede editar movimientos" },
      { status: 403 }
    );
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { monto, fecha, categoria, descripcion, comprobante_url, motivo } = body;

  if (typeof motivo !== "string" || !motivo.trim()) {
    return NextResponse.json(
      { error: "El motivo de la edición es obligatorio" },
      { status: 400 }
    );
  }

  const { data: t } = await db
    .from("transacciones")
    .select("id, tipo, monto, fecha, categoria, descripcion, comprobante_url, anulado, gestiones(cerrada)")
    .eq("id", id)
    .maybeSingle();
  if (!t) {
    return NextResponse.json({ error: "Movimiento no encontrado" }, { status: 404 });
  }
  if (t.anulado) {
    return NextResponse.json({ error: "El movimiento está anulado; no se puede editar" }, { status: 409 });
  }
  if ((t.gestiones as unknown as { cerrada: boolean }).cerrada) {
    return NextResponse.json(
      { error: "La gestión está cerrada e inmutable; no se puede editar" },
      { status: 409 }
    );
  }
  const origen = RESERVADAS[String(t.categoria ?? "")];
  if (origen) {
    return NextResponse.json(
      { error: `Es un movimiento de ${origen}; corrígelo desde su módulo` },
      { status: 409 }
    );
  }

  const montoNum = Number(monto);
  const err = validarTransaccion({ tipo: t.tipo, monto: montoNum, fecha: String(fecha ?? "") });
  if (err) return NextResponse.json({ error: err }, { status: 400 });
  if (!esFechaValida(String(fecha ?? ""))) {
    return NextResponse.json({ error: "Fecha inválida (yyyy-mm-dd)" }, { status: 400 });
  }

  const nuevo: Record<string, string | number | null> = {
    monto: montoNum,
    fecha: String(fecha),
    categoria: typeof categoria === "string" && categoria.trim() ? categoria.trim() : "otros",
    descripcion: typeof descripcion === "string" ? descripcion : "",
    // Sin archivo nuevo se conserva el comprobante actual (no se toca).
    comprobante_url:
      typeof comprobante_url === "string" && comprobante_url ? comprobante_url : t.comprobante_url,
  };

  const cambios: { campo: string; anterior: string | null; nuevo: string | null }[] = [];
  for (const campo of CAMPOS_EDITABLES) {
    const antes = t[campo] === null || t[campo] === undefined ? null : String(t[campo]);
    const despues =
      nuevo[campo] === null || nuevo[campo] === undefined ? null : String(nuevo[campo]);
    if (campo === "monto" ? Number(antes) !== Number(despues) : antes !== despues) {
      cambios.push({ campo, anterior: antes, nuevo: despues });
    }
  }
  if (cambios.length === 0) {
    return NextResponse.json({ ok: true, cambios: [] });
  }

  const { error } = await db.from("transacciones").update(nuevo).eq("id", id);
  if (error) {
    return NextResponse.json({ error: "No se pudo editar" }, { status: 500 });
  }

  const { error: errorHist } = await db.from("ediciones_transacciones").insert(
    cambios.map((c) => ({
      transaccion_id: id,
      campo: c.campo,
      anterior: c.anterior,
      nuevo: c.nuevo,
      autor: "responsable",
      motivo: motivo.trim(),
    }))
  );
  if (errorHist) {
    // Sin historial no hay edición: se revierte para no perder auditoría.
    await db.from("transacciones").update({
      monto: t.monto,
      fecha: t.fecha,
      categoria: t.categoria,
      descripcion: t.descripcion,
      comprobante_url: t.comprobante_url,
    }).eq("id", id);
    return NextResponse.json({ error: "No se pudo guardar el historial" }, { status: 500 });
  }

  // RF-8: el gasto de campaña vinculado sigue al monto editado.
  if (t.tipo === "egreso") {
    const cambioMonto = cambios.find((c) => c.campo === "monto");
    if (cambioMonto) {
      await db
        .from("campana_gastos")
        .update({ monto: montoNum })
        .eq("transaccion_id", id);
    }
  }

  return NextResponse.json({ ok: true, cambios });
}
