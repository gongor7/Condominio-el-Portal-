import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase";
import { sesionActual } from "@/lib/auth";
import { formatBs } from "@/lib/contabilidad";
import {
  agruparPorMes,
  mesActualAmericaLaPaz,
  esFechaValida,
} from "@/lib/salon";
import { PrintBoton } from "./print-boton";

export const dynamic = "force-dynamic";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function sumarMes(mes: string, delta: number): string {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function ReporteSalon({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const sesion = await sesionActual();
  if (!sesion) redirect("/entrar");

  const sp = await searchParams;
  const mesParam = sp.mes ?? mesActualAmericaLaPaz();
  const mes = esFechaValida(`${mesParam}-01`) ? mesParam : mesActualAmericaLaPaz();
  const [anio, m] = mes.split("-").map(Number);
  const desde = `${anio}-${String(m).padStart(2, "0")}-01`;
  const hasta = new Date(Date.UTC(m === 12 ? anio + 1 : anio, m === 12 ? 0 : m, 1))
    .toISOString()
    .slice(0, 10);

  const db = supabaseAdmin();
  const { data: gestion } = await db
    .from("gestiones")
    .select("id")
    .eq("cerrada", false)
    .order("fecha_inicio", { ascending: false })
    .limit(1)
    .maybeSingle();

  const [{ data: delMes }, { data: deGestion }] = await Promise.all([
    db
      .from("reservas")
      .select("id, fecha, vecino_nombre, vecino_casa, monto, descripcion, estado")
      .gte("fecha", desde)
      .lt("fecha", hasta)
      .order("fecha"),
    gestion
      ? db
          .from("reservas")
          .select("id, fecha, monto, estado, vecino_nombre")
          .eq("gestion_id", gestion.id)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const grupos = agruparPorMes(
    (delMes ?? []).map((r) => ({
      id: r.id,
      fecha: r.fecha,
      monto: Number(r.monto),
      estado: r.estado as "vigente" | "anulada",
      vecino_nombre: r.vecino_nombre,
    }))
  );
  const grupo = grupos[mes];
  const acumulado = (deGestion ?? [])
    .filter((r) => r.estado === "vigente" && Number(r.monto) > 0)
    .reduce((a, r) => a + Number(r.monto), 0);

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white print:bg-white print:p-0 print:text-black">
      <div className="mx-auto max-w-2xl">
        {/* Controles (no se imprimen) */}
        <div className="print:hidden">
          <a href="/panel/salon" className="text-sm text-emerald-300 hover:underline">
            ← Volver al salón
          </a>
          <div className="mt-3 flex items-center justify-between">
            <h1 className="text-xl font-bold">Reporte del salón</h1>
            <PrintBoton />
          </div>
          <div className="mt-3 flex items-center justify-center gap-4">
            <a
              href={`/panel/salon/reporte?mes=${sumarMes(mes, -1)}`}
              className="rounded-full border border-white/15 p-2 hover:bg-white/10"
              aria-label="Mes anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </a>
            <p className="w-44 text-center font-semibold">
              {MESES[m - 1]} {anio}
            </p>
            <a
              href={`/panel/salon/reporte?mes=${sumarMes(mes, 1)}`}
              className="rounded-full border border-white/15 p-2 hover:bg-white/10"
              aria-label="Mes siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Documento imprimible */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 print:mt-0 print:rounded-none print:border-0 print:bg-white print:p-0">
          <h2 className="text-lg font-bold">
            Condominio El Portal — Alquiler del salón de eventos
          </h2>
          <p className="text-sm opacity-80">
            {MESES[m - 1]} {anio}
          </p>

          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b text-left print:border-black">
                <th className="py-2">Fecha</th>
                <th className="py-2">Vecino</th>
                <th className="py-2">Evento</th>
                <th className="py-2 text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              {(grupo?.vigentes ?? []).map((r) => (
                <tr key={r.id} className="border-b border-white/5 print:border-black/10">
                  <td className="py-2">{r.fecha}</td>
                  <td className="py-2">{r.vecino_nombre}</td>
                  <td className="py-2 opacity-70">
                    {(delMes ?? []).find((x) => x.id === r.id)?.descripcion ?? ""}
                  </td>
                  <td className="py-2 text-right">
                    {r.monto > 0 ? formatBs(r.monto) : "gratuita"}
                  </td>
                </tr>
              ))}
              {(grupo?.vigentes ?? []).length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center opacity-60">
                    Sin reservas este mes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="mt-4 flex justify-end">
            <p className="text-right">
              <span className="opacity-70">Total del mes: </span>
              <b>{formatBs(grupo?.totalMes ?? 0)}</b>
              <br />
              <span className="opacity-70">Acumulado de la gestión: </span>
              <b>{formatBs(acumulado)}</b>
            </p>
          </div>

          {(grupo?.anuladas ?? []).length > 0 && (
            <p className="mt-4 text-xs opacity-60">
              Anuladas este mes: {grupo.anuladas.length} (excluidas del total).
            </p>
          )}

          <p className="mt-6 text-xs opacity-50">
            Generado el {new Date().toLocaleDateString("es-BO")} · Sistema de
            transparencia Condominio El Portal
          </p>
        </div>
      </div>
    </main>
  );
}

