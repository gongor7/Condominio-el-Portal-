import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { sesionActual } from "@/lib/auth";
import { formatBs, totalesGestion, saldoGestion } from "@/lib/contabilidad";
import { CerrarGestion } from "./acciones";
import { Pestanas } from "./pestanas";

export const dynamic = "force-dynamic";

export default async function Panel() {
  const sesion = await sesionActual();
  if (!sesion) redirect("/entrar");

  const { data: gestion } = await supabase
    .from("gestiones")
    .select("*")
    .eq("cerrada", false)
    .order("fecha_inicio", { ascending: false })
    .limit(1)
    .maybeSingle();

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
        <Pestanas />
        <div className="mt-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">{gestion?.nombre ?? "Sin gestión activa"}</h1>
          {esResponsable && gestion && <CerrarGestion gestionId={gestion.id} />}
          {esResponsable && !gestion && (
            <Link
              href="/panel/nueva-gestion"
              className="rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
            >
              + Nueva gestión
            </Link>
          )}
        </div>
        <p className="mt-1 text-sm text-slate-300">
          {gestion ? (
            <>
              Responsable: {gestion.responsable_nombre} · {gestion.responsable_casa}
              {gestion.cerrada && (
                <span className="ml-2 rounded-full bg-slate-800 px-2 py-0.5 text-xs text-amber-300">
                  cerrada {gestion.fecha_cierre ?? ""} — inmutable
                </span>
              )}
            </>
          ) : (
            "Crea una nueva gestión para empezar a registrar movimientos."
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

        {/* Campañas: acceso desde pestañas */}
        <section className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Campañas de recaudación</h2>
            <Link
              href="/panel/campanas"
              className="rounded-full border border-white/15 px-4 py-1.5 text-sm font-semibold hover:bg-white/10"
            >
              Ver campañas
            </Link>
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
