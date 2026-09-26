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

/**
 * Extrae el monto de un texto OCR en formato boliviano:
 * punto como separador de miles y coma decimal (1.234,56).
 * Tolerante a formato US (1,234.56) y a montos sin decimales (1.500).
 * Devuelve el número candidato más grande (el monto suele ser el importe mayor).
 */
export function extraerMonto(texto: string): number | null {
  // Descartar fechas para no confundir el año con un monto
  const sinFechas = texto
    .replace(/\d{4}-\d{1,2}-\d{1,2}/g, " ")
    .replace(/\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}/g, " ");

  const tokens = sinFechas.match(/\d[\d.,]*\d|\d/g) ?? [];
  const candidatos = tokens
    .map(normalizarNumero)
    .filter((n): n is number => n !== null && n > 0 && n < 100_000_000);

  if (candidatos.length === 0) return null;
  return Math.max(...candidatos);
}

/**
 * Interpreta un número con separadores según el formato boliviano:
 * - ambos separadores → el último es decimal, el otro miles (1.234,56 / 1,234.56)
 * - solo coma → 1-2 dígitos al final = decimal (350,00); grupos de 3 = miles (1,500)
 * - solo punto → grupos de 3 = miles (1.500); 1-2 dígitos al final = decimal (350.50)
 */
export function normalizarNumero(token: string): number | null {
  const t = token.replace(/\s/g, "");
  if (!/^\d[\d.,]*$/.test(t)) return null;

  const tieneComa = t.includes(",");
  const tienePunto = t.includes(".");

  let entero: string;
  let decimal = "";

  if (tieneComa && tienePunto) {
    const ultComa = t.lastIndexOf(",");
    const ultPunto = t.lastIndexOf(".");
    const sepDecimal = ultComa > ultPunto ? "," : ".";
    const sepMiles = sepDecimal === "," ? "." : ",";
    const partes = t.split(sepDecimal);
    decimal = partes.pop() ?? "";
    entero = partes.join("").split(sepMiles).join("");
  } else if (tieneComa) {
    const partes = t.split(",");
    if (partes.length === 2 && /^\d{1,2}$/.test(partes[1])) {
      entero = partes[0];
      decimal = partes[1];
    } else {
      entero = partes.join("");
    }
  } else if (tienePunto) {
    const partes = t.split(".");
    if (partes.length === 2 && /^\d{1,2}$/.test(partes[1])) {
      entero = partes[0];
      decimal = partes[1];
    } else {
      entero = partes.join("");
    }
  } else {
    entero = t;
  }

  const num = decimal !== "" ? Number(`${entero}.${decimal}`) : Number(entero);
  return Number.isFinite(num) ? num : null;
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
