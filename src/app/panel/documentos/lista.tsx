"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Trash2, X, FileText, Upload } from "lucide-react";

export interface Documento {
  id: string;
  titulo: string;
  descripcion: string;
  categoria: string;
  archivo_url: string;
  archivo_tipo: string;
  creado_en: string;
}

const CATEGORIAS = ["contrato", "escritura", "plano", "recibo", "otro"];

/** Spec-009: lista, visor y (responsable) subida/eliminación de documentos. */
export function DocumentosLista({
  documentos,
  esResponsable,
}: {
  documentos: Documento[];
  esResponsable: boolean;
}) {
  const router = useRouter();
  const [viendo, setViendo] = useState<Documento | null>(null);

  return (
    <div className="mt-6">
      {esResponsable && <FormSubir onHecho={() => router.refresh()} />}

      {documentos.length === 0 ? (
        <p className="mt-6 text-sm text-slate-400">
          Aún no hay documentos{esResponsable ? "; sube el primero arriba." : "."}
        </p>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {documentos.map((d) => (
            <li
              key={d.id}
              className="rounded-2xl border border-white/10 bg-white/5 p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-semibold">
                    <FileText className="h-4 w-4 shrink-0 text-emerald-400" />
                    <span className="truncate">{d.titulo}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    <span className="rounded-full bg-slate-800 px-2 py-0.5">{d.categoria}</span>
                    <span className="ml-2">{d.creado_en.slice(0, 10)}</span>
                  </p>
                  {d.descripcion && (
                    <p className="mt-1 line-clamp-2 text-sm text-slate-300">{d.descripcion}</p>
                  )}
                </div>
                {esResponsable && <EliminarBoton id={d.id} onHecho={() => router.refresh()} />}
              </div>
              <button
                onClick={() => setViendo(d)}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/15 py-2 text-sm font-semibold hover:bg-white/10"
              >
                <Eye className="h-4 w-4" /> Ver documento
              </button>
            </li>
          ))}
        </ul>
      )}

      {viendo && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-slate-950/90 p-4"
          onClick={() => setViendo(null)}
        >
          <div
            className="mx-auto flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">{viendo.titulo}</p>
                <p className="text-xs text-slate-400">
                  {viendo.categoria} · {viendo.creado_en.slice(0, 10)}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <a
                  href={viendo.archivo_url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/10"
                >
                  Abrir en pestaña nueva
                </a>
                <button
                  onClick={() => setViendo(null)}
                  aria-label="Cerrar"
                  className="rounded-lg border border-white/15 p-1.5 hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-950">
              {viendo.archivo_tipo.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={viendo.archivo_url}
                  alt={viendo.titulo}
                  className="h-full w-full object-contain"
                />
              ) : (
                <iframe
                  src={viendo.archivo_url}
                  title={viendo.titulo}
                  className="h-full w-full"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FormSubir({ onHecho }: { onHecho: () => void }) {
  const [abierto, setAbierto] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [categoria, setCategoria] = useState("contrato");
  const [descripcion, setDescripcion] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function subir(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      if (!archivo) {
        setError("Adjunta el archivo (PDF o imagen)");
        return;
      }
      const fd = new FormData();
      fd.append("archivo", archivo);
      fd.append("bucket", "documentos");
      const up = await fetch("/api/subir-archivo", { method: "POST", body: fd });
      const upd = await up.json();
      if (!up.ok) {
        setError(upd.error ?? "No se pudo subir el archivo");
        return;
      }
      const res = await fetch("/api/documentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo,
          categoria,
          descripcion,
          archivo_url: upd.url,
          archivo_tipo: archivo.type || "application/pdf",
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? "No se pudo guardar el documento");
        return;
      }
      setTitulo("");
      setDescripcion("");
      setArchivo(null);
      setAbierto(false);
      onHecho();
    } finally {
      setEnviando(false);
    }
  }

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="flex items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
      >
        <Upload className="h-4 w-4" /> Subir documento
      </button>
    );
  }

  return (
    <form
      onSubmit={subir}
      className="rounded-2xl border border-white/10 bg-white/5 p-5"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          Título
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            required
            placeholder="Ej. Contrato de mantenimiento de piscinas"
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2"
          />
        </label>
        <label className="text-sm">
          Categoría
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2"
          >
            {CATEGORIAS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="mt-3 block text-sm">
        Descripción (opcional)
        <input
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2"
        />
      </label>
      <input
        type="file"
        accept="application/pdf,image/*"
        onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
        className="mt-3 w-full rounded-lg border border-dashed border-white/20 bg-slate-900 p-3 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-emerald-500 file:px-3 file:py-1.5 file:font-semibold file:text-slate-950"
      />
      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={enviando}
          className="flex-1 rounded-lg bg-emerald-500 py-2 font-semibold text-slate-950 disabled:opacity-50"
        >
          {enviando ? "Guardando…" : "Guardar documento"}
        </button>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="rounded-lg border border-white/15 px-4 py-2 text-sm"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function EliminarBoton({ id, onHecho }: { id: string; onHecho: () => void }) {
  async function eliminar() {
    if (!window.confirm("¿Eliminar este documento y su archivo?")) return;
    const res = await fetch(`/api/documentos/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json();
      window.alert(d.error ?? "No se pudo eliminar");
      return;
    }
    onHecho();
  }
  return (
    <button
      onClick={eliminar}
      aria-label="Eliminar documento"
      className="rounded-full p-1.5 hover:bg-red-500/20"
    >
      <Trash2 className="h-4 w-4 text-red-400" />
    </button>
  );
}
