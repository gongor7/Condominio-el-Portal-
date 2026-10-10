import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { generarCaptcha } from "@/lib/captcha";

const db = supabaseAdmin();

/** Genera un reto captcha propio (aritmética simple) válido 10 minutos, un solo uso. */
export async function GET() {
  const reto = generarCaptcha();
  const { data, error } = await db
    .from("captcha_reto")
    .insert({ respuesta: reto.respuesta })
    .select("id")
    .single();
  if (error) {
    return NextResponse.json({ error: "No se pudo generar el captcha" }, { status: 500 });
  }
  return NextResponse.json({ captcha_id: data.id, pregunta: reto.pregunta });
}
