import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local"
  );
}

/** Cliente de Supabase (anon). La seguridad de escritura la validan las API routes. */
export const supabase = createClient(url, anonKey);

/** Bucket de Supabase Storage donde viven los comprobantes. */
export const BUCKET = "comprobantes";
