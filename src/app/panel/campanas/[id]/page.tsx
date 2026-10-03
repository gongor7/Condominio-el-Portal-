import { notFound, redirect } from "next/navigation";
import { CircleCheck, CircleMinus, Scale } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { sesionActual } from "@/lib/auth";
import { formatBs, resumenCampana, progresoCampana } from "@/lib/contabilidad";
import FormAporte from "./form-aporte";
import { CerrarCampana } from "../../acciones";

export const dynamic = "force-dynamic";

export default async function CampanaDetalle({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const sesion = await sesionActual();
  if (!sesion) redirect("/entrar");
  const { id } = await params;

  const { data: campana } = await supabase
    .from("campanas")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!campana) notFound();

  const [{ data: aportes }, { data: gastos }] = await Promise.all([
    supabase
      .from("aportes")
      .select("*")
      .eq("campana_id", id)
      .order("creado_en", { ascending: false }),
    supabase
      .from("campana_gastos")
      .select("*")
      .eq("campana_id", id)
      .order("fecha", { ascending: false }),
  ]);

  const resumen = resumenCampana({
    meta: campana.meta !== null ? Number(campana.meta) : null,
    estado: campana.estado,
    aportes: (aportes ?? []).filter((a) => !a.anulado).map((a) => Number(a.monto)),
    gastos: (gastos ?? []).filter((g) => !g.anulado).map((g) => Number(g.monto)),
  });

  const progreso = progresoCampana(resumen.recaudado, resumen.meta);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <a href="/panel" className="text-sm text-emerald-300 hover:underline">
          ← Volver al panel
        </a>
        <div className="mt-3 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">{campana.titulo}</h1>
          {sesion.rol === "responsable" && campana.estado === "activa" && (
            <CerrarCampana campanaId={campana.id} />
          )}
        </div>
        <p className="mt-1 text-slate-300">{campana.descripcion}</p>
        {campana.estado === "cerrada" && (
          <p className="mt-2 rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-amber-300">
            Pago extraordinario cerrado — los aportes quedaron congelados
          </p>
        )}

        {/* Progreso */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-end justify-between">
            <p className="text-sm text-slate-300">Recaudado</p>
            <p className="text-2xl font-bold text-emerald-400">
              {formatBs(resumen.recaudado)}
              {resumen.meta !== null && (
                <span className="text-sm font-normal text-slate-400">
                  {" "}
                  / {formatBs(resumen.meta)}
                </span>
              )}
            </p>
          </div>
          {progreso !== null && (
            <>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                <span>{progreso}% pagado</span>
                <span>
                  {formatBs(resumen.recaudado)} de {formatBs(resumen.meta as number)}
                </span>
              </div>
              <div className="mt-1 h-3 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${progreso}%` }}
                />
              </div>
            </>
          )}
          {resumen.faltante !== null && resumen.faltante > 0 && (
            <p className="mt-2 text-sm text-amber-400">
              Faltan {formatBs(resumen.faltante)} para la meta
            </p>
          )}
          {resumen.gastado > 0 && (
            <div className="mt-4 border-t border-white/10 pt-4">
              <p className="text-sm text-slate-300">
                Gastado: <b className="text-red-400">{formatBs(resumen.gastado)}</b>
              </p>
              <p
                className={`mt-1 flex items-center gap-2 text-lg font-bold ${
                  resumen.estadoSugerido === "falta"
                    ? "text-red-400"
                    : "text-emerald-400"
                }`}
              >
                {resumen.estadoSugerido === "falta" ? (
                  <>
                    <CircleMinus className="h-5 w-5" />
                    Faltan {formatBs(Math.abs(resumen.saldo))}
                  </>
                ) : resumen.estadoSugerido === "sobra" ? (
                  <>
                    <CircleCheck className="h-5 w-5" />
                    Sobran {formatBs(resumen.saldo)}
                  </>
                ) : (
                  <>
                    <Scale className="h-5 w-5" />
                    Cuadra exacto
                  </>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Subir aporte */}
        {campana.estado === "activa" && <FormAporte campanaId={campana.id} />}

        {/* Aportes */}
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Aportes de los vecinos</h2>
          <ul className="mt-3 divide-y divide-white/5 rounded-2xl border border-white/10">
            {(aportes ?? []).length === 0 && (
              <li className="px-4 py-4 text-sm text-slate-400">
                Sé el primero en aportar.
              </li>
            )}
            {(aportes ?? []).map((a) => (
              <li key={a.id} className="flex items-center justify-between px-4 py-3">
                <span className="font-medium">{a.vecino_nombre}</span>
                <span className="flex items-center gap-3">
                  {a.comprobante_url && (
                    <a
                      href={a.comprobante_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-emerald-300 underline"
                    >
                      comprobante
                    </a>
                  )}
                  <b className="text-emerald-400">{formatBs(Number(a.monto))}</b>
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Gastos */}
        {gastos && gastos.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold">Gastos del pago extraordinario</h2>
            <ul className="mt-3 divide-y divide-white/5 rounded-2xl border border-white/10">
              {gastos.map((g) => (
                <li key={g.id} className="flex items-center justify-between px-4 py-3">
                  <span>
                    {g.descripcion || "Gasto"}
                    <span className="ml-2 text-xs text-slate-400">{g.fecha}</span>
                    {g.comprobante_url && (
                      <a
                        href={g.comprobante_url}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-2 text-xs text-emerald-300 underline"
                      >
                        comprobante
                      </a>
                    )}
                  </span>
                  <b className="text-red-400">−{formatBs(Number(g.monto))}</b>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
