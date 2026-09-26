import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local"
  );
}

/** Cliente público (anon): solo lectura, respetado por RLS. */
export const supabase = createClient(url, anonKey);

/** Bucket de Supabase Storage donde viven los comprobantes. */
export const BUCKET = "comprobantes";

let adminCache: SupabaseClient | null = null;

/**
 * Cliente de servidor (service_role): el único con permisos de escritura.
 * NUNCA importar desde código de cliente ("use client").
 */
export function supabaseAdmin(): SupabaseClient {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || key === "PENDIENTE" || !url) {
    throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY en .env.local");
  }
  if (!adminCache) {
    adminCache = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return adminCache;
}
