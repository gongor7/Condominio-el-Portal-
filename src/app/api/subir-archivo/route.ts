import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, BUCKET } from "@/lib/supabase";
import { sesionActual } from "@/lib/auth";

const db = supabaseAdmin();

const MAX_MB = 10;
const TIPOS = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export async function POST(req: NextRequest) {
  const sesion = await sesionActual();
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const form = await req.formData();
  const archivo = form.get("archivo");
  // Bucket opcional (Spec-009); por defecto el histórico de comprobantes
  const bucketParam = String(form.get("bucket") ?? BUCKET);
  const bucket = ["comprobantes", "documentos"].includes(bucketParam) ? bucketParam : BUCKET;
  if (!(archivo instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  }
  if (!TIPOS.includes(archivo.type)) {
    return NextResponse.json(
      { error: "Solo imágenes (JPG/PNG/WebP) o PDF" },
      { status: 400 }
    );
  }
  if (archivo.size > MAX_MB * 1024 * 1024) {
    return NextResponse.json(
      { error: `El archivo supera los ${MAX_MB} MB` },
      { status: 400 }
    );
  }

  const ext = archivo.name.split(".").pop() ?? "bin";
  const nombre = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const { error } = await db.storage
    .from(bucket)
    .upload(nombre, archivo, { contentType: archivo.type });

  if (error) {
    return NextResponse.json(
      { error: "No se pudo subir el archivo a Supabase Storage" },
      { status: 500 }
    );
  }

  const { data } = db.storage.from(bucket).getPublicUrl(nombre);
  return NextResponse.json({ ok: true, url: data.publicUrl });
}
