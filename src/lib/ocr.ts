"use client";

import { createWorker } from "tesseract.js";

/** Convierte la primera página de un PDF a imagen para que el OCR pueda leerla. */
async function pdfPrimeraPagina(file: File | Blob): Promise<Blob> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pagina = await pdf.getPage(1);
  const escala = 2; // resolución suficiente para el OCR sin volverlo lento
  const viewport = pagina.getViewport({ scale: escala });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await pagina.render({
    canvas,
    canvasContext: canvas.getContext("2d")!,
    viewport,
  } as Parameters<typeof pagina.render>[0]).promise;
  return new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b ?? new Blob()), "image/png")
  );
}

export interface ResultadoOCR {
  texto: string;
  monto: number | null;
  fecha: string | null; // yyyy-mm-dd
}

/** Extrae el monto: el número con decimales más grande del texto (formato 1.234,56 o 1234.56). */
export function extraerMonto(texto: string): number | null {
  const patrones = [
    /(\d{1,3}(?:\.\d{3})+,\d{2})/g, // 1.234,56
    /(\d+,\d{2})/g, // 1234,56
    /(\d{1,3}(?:,\d{3})+\.\d{2})/g, // 1,234.56
    /(\d+\.\d{2})/g, // 1234.56
    /(\b\d{2,6}\b)/g, // entero simple
  ];
  let mejor: number | null = null;
  for (const p of patrones) {
    const encontrados = [...texto.matchAll(p)].map((m) =>
      normalizarNumero(m[1])
    );
    const validos = encontrados.filter(
      (n) => n !== null && n > 0 && n < 1_000_000
    ) as number[];
    if (validos.length) {
      const max = Math.max(...validos);
      if (mejor === null || max > mejor) mejor = max;
    }
    if (mejor !== null && p.source.includes("\\d{2}")) break; // ya hay candidato con decimales
  }
  return mejor;
}

function normalizarNumero(s: string): number | null {
  const limpio = s.replace(/\s/g, "");
  // Decide separador decimal: última coma o punto seguida de exactamente 2 dígitos al final
  const m = limpio.match(/^(\d{1,3}(?:[.,]\d{3})*)([.,])(\d{2})$/) ?? null;
  let num: string;
  if (m) {
    num = m[1].replace(/[.,]/g, "") + "." + m[3]; // formato es-BO
  } else {
    num = limpio.replace(/,/g, ""); // 1,234 estilo en sin decimales explícitos
  }
  const n = Number(num);
  return Number.isFinite(n) ? n : null;
}

const MESES: Record<string, string> = {
  enero: "01", febrero: "02", marzo: "03", abril: "04", mayo: "05", junio: "06",
  julio: "07", agosto: "08", septiembre: "09", octubre: "10", noviembre: "11", diciembre: "12",
};

/** Extrae una fecha (dd/mm/yyyy, yyyy-mm-dd o "12 de septiembre de 2026"). */
export function extraerFecha(texto: string): string | null {
  const t = texto.toLowerCase();
  let m = t.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = t.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (m) {
    const yyyy = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${yyyy}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  m = t.match(/(\d{1,2})\s+de\s+([a-zñ]+)\s+de\s+(\d{4})/);
  if (m && MESES[m[2]]) {
    return `${m[3]}-${MESES[m[2]]}-${m[1].padStart(2, "0")}`;
  }
  return null;
}

/** Ejecuta OCR sobre una imagen o PDF (primera página) en el navegador, todo local. */
export async function leerComprobante(file: File | Blob): Promise<ResultadoOCR> {
  let entrada: File | Blob = file;
  if (file.type === "application/pdf") {
    entrada = await pdfPrimeraPagina(file);
  }
  const worker = await createWorker("spa");
  try {
    const { data } = await worker.recognize(entrada);
    const texto = data.text ?? "";
    return { texto, monto: extraerMonto(texto), fecha: extraerFecha(texto) };
  } finally {
    await worker.terminate();
  }
}
