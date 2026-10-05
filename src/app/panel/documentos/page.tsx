import { redirect } from "next/navigation";
import { FolderOpen } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase";
import { sesionActual } from "@/lib/auth";
import { Pestanas } from "../pestanas";
import { DocumentosLista } from "./lista";

export const dynamic = "force-dynamic";

export default async function DocumentosPage() {
  const sesion = await sesionActual();
  if (!sesion) redirect("/entrar");
  const esResponsable = sesion.rol === "responsable";

  const db = supabaseAdmin();
  const { data: documentos } = await db
    .from("documentos")
    .select("*")
    .order("creado_en", { ascending: false });

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Pestanas />

        <div className="mt-6 flex items-center gap-2">
          <FolderOpen className="h-6 w-6 text-emerald-400" />
          <h1 className="text-2xl font-bold">Documentos del condominio</h1>
        </div>
        <p className="mt-1 text-sm text-slate-300">
          Contratos, escrituras y papeles importantes, siempre a mano para todos los vecinos.
        </p>

        <DocumentosLista
          documentos={(documentos ?? []).map((d) => ({
            id: d.id,
            titulo: d.titulo,
            descripcion: d.descripcion,
            categoria: d.categoria,
            archivo_url: d.archivo_url,
            archivo_tipo: d.archivo_tipo,
            creado_en: d.creado_en,
          }))}
          esResponsable={esResponsable}
        />
      </div>
    </main>
  );
}
