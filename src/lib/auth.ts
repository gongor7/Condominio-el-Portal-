import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

export type Rol = "vecino" | "responsable";

export interface Sesion {
  rol: Rol;
  emite: number; // timestamp de emisión
}

const COOKIE = "portal_sesion";
const SECRET =
  process.env.AUTH_SECRET ?? "dev-secret-cambiar-en-produccion";

export function firmarSesion(sesion: Sesion): string {
  const payload = Buffer.from(JSON.stringify(sesion)).toString("base64url");
  const mac = createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}.${mac}`;
}

export function verificarSesion(valor: string | undefined): Sesion | null {
  if (!valor) return null;
  const [payload, mac] = valor.split(".");
  if (!payload || !mac) return null;
  const esperado = createHmac("sha256", SECRET).update(payload).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(esperado);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const s = JSON.parse(Buffer.from(payload, "base64url").toString()) as Sesion;
    if (s.rol !== "vecino" && s.rol !== "responsable") return null;
    return s;
  } catch {
    return null;
  }
}

/** Lee la sesión desde las cookies (server components y route handlers). */
export async function sesionActual(): Promise<Sesion | null> {
  const store = await cookies();
  return verificarSesion(store.get(COOKIE)?.value);
}

export const COOKIE_SESION = COOKIE;
