import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { sesionActual } from "@/lib/auth";
import {
  formatBs,
  totalesGestion,
  saldoGestion,
  resumenCampana,
  progresoCampana,
} from "@/lib/contabilidad";
import { CerrarGestion } from "./acciones";

export const dynamic = "force-dynamic";

export default async function Panel() {
  const sesion = await sesionActual();
  if (!sesion) redirect("/entrar");

  const [{ data: gestion }, { data: campanas }] = await Promise.all([
    supabase
      .from("gestiones")
      .select("*")
      .eq("cerrada", false)
      .order("fecha_inicio", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("campanas").select("*").order("creado_en", { ascending: false }),
  ]);

  const trans = gestion
    ? (
        await supabase
          .from("transacciones")
          .select("*")
          .eq("gestion_id", gestion.id)
          .order("fecha", { ascending: false })
      ).data ?? []
    : [];

  const totals = totalesGestion(trans ?? []);
  const saldo = saldoGestion(trans ?? [], gestion?.saldo_inicial ?? 0);

  const campanasConResumen = await Promise.all(
    (campanas ?? []).map(async (c) => {
      const [{ data: aportes }, { data: gastos }] = await Promise.all([
        supabase.from("aportes").select("monto").eq("campana_id", c.id),
        supabase.from("campana_gastos").select("monto").eq("campana_id", c.id),
      ]);
      return {
        ...c,
        resumen: resumenCampana({
          meta: c.meta,
          estado: c.estado,
          aportes: (aportes ?? []).map((a) => Number(a.monto)),
          gastos: (gastos ?? []).map((g) => Number(g.monto)),
        }),
      };
    })
  );

  const esResponsable = sesion.rol === "responsable";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold">
            <Building2 className="h-5 w-5 text-emerald-400" />
            Condominio El Portal
          </Link>
          <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
            {esResponsable ? "Responsable" : "Vecino"}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{gestion?.nombre ?? "Sin gestión activa"}</h1>
          {esResponsable && gestion && <CerrarGestion gestionId={gestion.id} />}
        </div>
        <p className="mt-1 text-sm text-slate-300">
          Responsable: {gestion?.responsable_nombre} · {gestion?.responsable_casa}
          {gestion?.cerrada && (
            <span className="ml-2 rounded-full bg-slate-800 px-2 py-0.5 text-xs text-amber-300">
              cerrada {gestion.fecha_cierre ?? ""} — inmutable
            </span>
          )}
        </p>

        {/* Resumen */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase text-slate-400">Ingresos</p>
            <p className="mt-1 text-lg font-bold text-emerald-400">
              {formatBs(totals.ingresos)}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase text-slate-400">Egresos</p>
            <p className="mt-1 text-lg font-bold text-red-400">
              {formatBs(totals.egresos)}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase text-slate-400">Saldo</p>
            <p className="mt-1 text-lg font-bold">{formatBs(saldo)}</p>
          </div>
        </div>

        {/* Campañas */}
        <section className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Campañas de recaudación</h2>
            <div className="flex gap-2">
              <Link
                href="/panel/salon"
                className="rounded-full border border-white/15 px-4 py-1.5 text-sm font-semibold hover:bg-white/10"
              >
                Salón de eventos
              </Link>
              {esResponsable && (
                <Link
                  href="/panel/nueva-campana"
                  className="rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
                >
                  + Nueva campaña
                </Link>
              )}
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {campanasConResumen.length === 0 && (
              <p className="text-sm text-slate-400">
                Aún no hay campañas activas.
              </p>
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
                <p className="mt-1 line-clamp-2 text-sm text-slate-300">
                  {c.descripcion}
                </p>
                <p className="mt-3 text-sm">
                  Recaudado:{" "}
                  <b className="text-emerald-400">{formatBs(c.resumen.recaudado)}</b>
                  {c.resumen.meta !== null && (
                    <> de {formatBs(c.resumen.meta)}</>
                  )}
                </p>
                {progresoCampana(c.resumen.recaudado, c.resumen.meta) !== null && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{progresoCampana(c.resumen.recaudado, c.resumen.meta)}% pagado</span>
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
                      c.resumen.estadoSugerido === "falta"
                        ? "text-red-400"
                        : "text-emerald-400"
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
        </section>

        {/* Libro contable */}
        <section className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Libro contable</h2>
            {esResponsable && (
              <Link
                href="/panel/registrar"
                className="rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
              >
                + Registrar movimiento
              </Link>
            )}
          </div>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-white/5 text-left text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Descripción</th>
                  <th className="px-4 py-3">Categoría</th>
                  <th className="px-4 py-3 text-right">Ingreso</th>
                  <th className="px-4 py-3 text-right">Egreso</th>
                </tr>
              </thead>
              <tbody>
                {trans.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                      Sin movimientos aún.
                    </td>
                  </tr>
                )}
                {trans.map((t) => (
                  <tr
                    key={t.id}
                    className={`border-t border-white/5 ${t.anulado ? "opacity-40 line-through" : ""}`}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">{t.fecha}</td>
                    <td className="px-4 py-3">
                      {t.descripcion}
                      {t.comprobante_url && (
                        <a
                          href={t.comprobante_url}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-2 text-xs text-emerald-300 underline"
                        >
                          comprobante
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-300">{t.categoria}</td>
                    <td className="px-4 py-3 text-right text-emerald-400">
                      {t.tipo === "ingreso" && !t.anulado ? formatBs(Number(t.monto)) : ""}
                    </td>
                    <td className="px-4 py-3 text-right text-red-400">
                      {t.tipo === "egreso" && !t.anulado ? formatBs(Number(t.monto)) : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
