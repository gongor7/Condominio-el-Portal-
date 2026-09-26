import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sesionActual } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sesion = await sesionActual();
  if (!sesion || sesion.rol !== "responsable") {
    return NextResponse.json(
      { error: "Solo el responsable puede anular movimientos" },
      { status: 403 }
    );
  }
  const { id } = await params;
  const { motivo } = await req.json().catch(() => ({}));

  if (typeof motivo !== "string" || !motivo.trim()) {
    return NextResponse.json(
      { error: "El motivo de anulación es obligatorio (RF-11)" },
      { status: 400 }
    );
  }

  const { data: transaccion } = await supabase
    .from("transacciones")
    .select("id, anulado, gestiones(cerrada)")
    .eq("id", id)
    .maybeSingle();
  if (!transaccion) {
    return NextResponse.json({ error: "Movimiento no encontrado" }, { status: 404 });
  }
  if (transaccion.anulado) {
    return NextResponse.json({ error: "Ya está anulado" }, { status: 409 });
  }
  if ((transaccion.gestiones as unknown as { cerrada: boolean }).cerrada) {
    return NextResponse.json(
      { error: "La gestión está cerrada e inmutable; no se puede anular" },
      { status: 409 }
    );
  }

  const { error } = await supabase
    .from("transacciones")
    .update({
      anulado: true,
      anulado_motivo: motivo.trim(),
      anulado_en: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) {
    return NextResponse.json({ error: "No se pudo anular" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
