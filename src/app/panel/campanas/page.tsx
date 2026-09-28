import Link from "next/link";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { sesionActual } from "@/lib/auth";
import { formatBs, resumenCampana, progresoCampana } from "@/lib/contabilidad";
import { Pestanas } from "../pestanas";

export const dynamic = "force-dynamic";

export default async function CampanasPage() {
  const sesion = await sesionActual();
  if (!sesion) redirect("/entrar");
  const esResponsable = sesion.rol === "responsable";

  const [{ data: campanas }, { data: todosAportes }, { data: todosGastos }] =
    await Promise.all([
      supabase.from("campanas").select("*").order("creado_en", { ascending: false }),
      supabase.from("aportes").select("campana_id, monto"),
      supabase.from("campana_gastos").select("campana_id, monto"),
    ]);

  const aportesPorCampana = new Map<string, number[]>();
  for (const a of todosAportes ?? []) {
    const list = aportesPorCampana.get(a.campana_id) ?? [];
    list.push(Number(a.monto));
    aportesPorCampana.set(a.campana_id, list);
  }

  const gastosPorCampana = new Map<string, number[]>();
  for (const g of todosGastos ?? []) {
    const list = gastosPorCampana.get(g.campana_id) ?? [];
    list.push(Number(g.monto));
    gastosPorCampana.set(g.campana_id, list);
  }

  const campanasConResumen = (campanas ?? []).map((c) => ({
    ...c,
    resumen: resumenCampana({
      meta: c.meta,
      estado: c.estado,
      aportes: aportesPorCampana.get(c.id) ?? [],
      gastos: gastosPorCampana.get(c.id) ?? [],
    }),
  }));

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Pestanas />

        <div className="mt-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Campañas de recaudación</h1>
          {esResponsable && (
            <Link
              href="/panel/nueva-campana"
              className="rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
            >
              + Nueva campaña
            </Link>
          )}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {campanasConResumen.length === 0 && (
            <p className="text-sm text-slate-400">Aún no hay campañas activas.</p>
          )}
          {campanasConResumen.map((c) => (
            <Link
              key={c.id}
              href={`/panel/campanas/${c.id}`}
              className="block rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-emerald-400/40"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{c.titulo}</h3>
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                  {c.estado}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-slate-300">{c.descripcion}</p>
              <p className="mt-3 text-sm">
                Recaudado:{" "}
                <b className="text-emerald-400">{formatBs(c.resumen.recaudado)}</b>
                {c.resumen.meta !== null && <> de {formatBs(c.resumen.meta)}</>}
              </p>
              {progresoCampana(c.resumen.recaudado, c.resumen.meta) !== null && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>
                      {progresoCampana(c.resumen.recaudado, c.resumen.meta)}% pagado
                    </span>
                  </div>
                  <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{
                        width: `${progresoCampana(c.resumen.recaudado, c.resumen.meta)}%`,
                      }}
                    />
                  </div>
                </div>
              )}
              {c.resumen.gastado > 0 && (
                <p
                  className={`text-sm font-semibold ${
                    c.resumen.estadoSugerido === "falta" ? "text-red-400" : "text-emerald-400"
                  }`}
                >
                  {c.resumen.estadoSugerido === "falta"
                    ? `Faltan ${formatBs(Math.abs(c.resumen.saldo))}`
                    : c.resumen.estadoSugerido === "sobra"
                      ? `Sobran ${formatBs(c.resumen.saldo)}`
                      : "Cuadra exacto"}
                </p>
              )}
              {c.resumen.faltante !== null &&
                c.resumen.faltante > 0 &&
                c.resumen.gastado === 0 && (
                  <p className="text-sm text-amber-400">
                    Faltan {formatBs(c.resumen.faltante)} para la meta
                  </p>
                )}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
