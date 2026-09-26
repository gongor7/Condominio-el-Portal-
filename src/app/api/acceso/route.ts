import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { firmarSesion, COOKIE_SESION } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { codigo, pin } = await req.json().catch(() => ({}));
  if (typeof codigo !== "string" || !codigo) {
    return NextResponse.json({ error: "Ingresa el código" }, { status: 400 });
  }

  const { data: config, error } = await supabase
    .from("config")
    .select("codigo_vecino, pin_responsable")
    .eq("id", 1)
    .single();

  if (error || !config) {
    return NextResponse.json(
      { error: "Servicio no disponible, intenta más tarde" },
      { status: 500 }
    );
  }

  const codigoOk =
    codigo.toUpperCase() === config.codigo_vecino.toUpperCase() &&
    (!pin || pin === config.pin_responsable);

  if (!codigoOk) {
    // Mensaje genérico: no revelar si el código o el PIN falló
    return NextResponse.json(
      { error: "Código o PIN incorrecto" },
      { status: 401 }
    );
  }

  const rol = pin ? "responsable" : "vecino";
  const token = firmarSesion({ rol, emite: Date.now() });
  const res = NextResponse.json({ ok: true, rol });
  res.cookies.set(COOKIE_SESION, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 60, // 60 días
    path: "/",
  });
  return res;
}
