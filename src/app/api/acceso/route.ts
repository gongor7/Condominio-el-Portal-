import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase";
import { firmarSesion, COOKIE_SESION } from "@/lib/auth";
import { validarCaptcha } from "@/lib/captcha";

const db = supabaseAdmin();

/** Umbral de fallos a partir del cual se exige captcha (Spec: endurecimiento). */
const UMBRAL_CAPTCHA = 10;

function ipDe(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  return fwd.split(",")[0]?.trim() || "desconocida";
}

async function fallosDe(ip: string): Promise<number> {
  const { data } = await db
    .from("acceso_intentos")
    .select("fallos")
    .eq("ip", ip)
    .maybeSingle();
  return data?.fallos ?? 0;
}

async function registrarFallo(ip: string) {
  await db.rpc("incrementar_fallos", { p_ip: ip });
}

async function limpiarFallos(ip: string) {
  await db.from("acceso_intentos").upsert(
    { ip, fallos: 0, actualizado_en: new Date().toISOString() },
    { onConflict: "ip" }
  );
}

/** Valida el captcha consumiendo el reto (un solo uso). */
async function validarReto(
  captchaId: unknown,
  respuesta: unknown
): Promise<boolean> {
  if (typeof captchaId !== "string" || typeof respuesta !== "string") return false;
  const { data: reto } = await db
    .from("captcha_reto")
    .select("id, respuesta, expira")
    .eq("id", captchaId)
    .maybeSingle();
  // consumo el reto aunque la respuesta sea incorrecta
  await db.from("captcha_reto").delete().eq("id", captchaId);
  if (!reto) return false;
  if (new Date(reto.expira).getTime() < Date.now()) return false;
  return validarCaptcha(respuesta, reto.respuesta);
}

export async function POST(req: NextRequest) {
  const ip = ipDe(req);
  const { codigo, pin, captcha_id, captcha_respuesta } = await req.json().catch(() => ({}));

  // A partir del 10° fallo se exige captcha
  const requiereCaptcha = (await fallosDe(ip)) >= UMBRAL_CAPTCHA;
  if (requiereCaptcha) {
    const ok = await validarReto(captcha_id, captcha_respuesta);
    if (!ok) {
      await registrarFallo(ip);
      return NextResponse.json(
        {
          error: "Demasiados intentos fallidos: resuelve el captcha para continuar.",
          captcha_requerido: true,
        },
        { status: 429 }
      );
    }
  }

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
    await registrarFallo(ip);
    return NextResponse.json(
      { error: "Código o PIN incorrecto" },
      { status: 401 }
    );
  }

  await limpiarFallos(ip);

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
