import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sesionActual } from "@/lib/auth";

const db = supabaseAdmin();

/** RF-4: alta y renombre de casas (id interno estable, el histórico no se rompe). */
export async function POST(req: NextRequest) {
  const sesion = await sesionActual();
  if (!sesion || sesion.rol !== "responsable") {
    return NextResponse.json({ error: "Solo el responsable" }, { status: 403 });
  }
  const { numero, vecino_nombre } = await req.json().catch(() => ({}));
  const num = Number(numero);
  if (!Number.isInteger(num) || num <= 0) {
    return NextResponse.json({ error: "Número inválido" }, { status: 400 });
  }
  if (typeof vecino_nombre !== "string" || !vecino_nombre.trim()) {
    return NextResponse.json({ error: "Falta el nombre" }, { status: 400 });
  }
  const { error } = await db
    .from("casas")
    .insert({ numero: num, vecino_nombre: vecino_nombre.trim() });
  if (error) {
    if (/casas_numero_key/.test(error.message)) {
      return NextResponse.json({ error: "Ese número ya existe" }, { status: 409 });
    }
    return NextResponse.json({ error: "No se pudo agregar" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const sesion = await sesionActual();
  if (!sesion || sesion.rol !== "responsable") {
    return NextResponse.json({ error: "Solo el responsable" }, { status: 403 });
  }
  const { id, vecino_nombre, telefono } = await req.json().catch(() => ({}));
  if (typeof id !== "string" || typeof vecino_nombre !== "string" || !vecino_nombre.trim()) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const cambios: Record<string, string | null> = { vecino_nombre: vecino_nombre.trim() };
  if (typeof telefono === "string") {
    const limpio = telefono.replace(/[^0-9]/g, "");
    if (limpio && !/^0*591\d{8}$|^\d{8}$/.test(limpio)) {
      return NextResponse.json({ error: "Teléfono inválido (8 dígitos, o con +591)" }, { status: 400 });
    }
    cambios.telefono = limpio || null;
  }
  const { error } = await db.from("casas").update(cambios).eq("id", id);
  if (error) {
    return NextResponse.json({ error: "No se pudo renombrar" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
