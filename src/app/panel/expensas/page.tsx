import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import { sesionActual } from "@/lib/auth";
import { formatBs } from "@/lib/contabilidad";
import { totalExpensas, type PeriodoExpensa } from "@/lib/expensas";
import { estadoMes } from "@/lib/deudas";
import { hoyAmericaLaPaz } from "@/lib/salon";
import { Pestanas } from "../pestanas";
import { GrillaExpensas } from "./grilla-expensas";

export const dynamic = "force-dynamic";

export default async function ExpensasPage() {
  const sesion = await sesionActual();
  if (!sesion) redirect("/entrar");
  const esResponsable = sesion.rol === "responsable";

  const db = supabaseAdmin();
  const { data: gestion } = await db
    .from("gestiones")
    .select("id")
    .eq("cerrada", false)
    .order("fecha_inicio", { ascending: false })
    .limit(1)
    .maybeSingle();

  let casas: { id: string; numero: number; vecino_nombre: string }[] = [];
  let periodos: { id: string; mes: string; monto: string | number; fecha_limite: string | null }[] = [];
  let pagos: {
    id: string;
    casa_id: string;
    monto_total: string | number;
    comprobante_url: string | null;
    fecha_pago: string;
    estado: string;
    pagos_expensas_meses: { mes: string; monto_mes: string | number; vigente: boolean }[];
  }[] = [];

  if (gestion) {
    const [rCasas, rPeriodos, rPagos] = await Promise.all([
      db
        .from("casas")
        .select("id, numero, vecino_nombre, telefono")
        .eq("activo", true)
        .order("numero"),
      db
        .from("periodos_expensas")
        .select("id, mes, monto, fecha_limite")
        .eq("gestion_id", gestion.id)
        .order("mes"),
      db
        .from("pagos_expensas")
        .select(
          "id, casa_id, monto_total, comprobante_url, fecha_pago, estado, pagos_expensas_meses(mes, monto_mes, vigente)"
        )
        .eq("gestion_id", gestion.id)
        .order("creado_en", { ascending: false }),
    ]);
    casas = (rCasas.data as typeof casas) ?? [];
    periodos = (rPeriodos.data as typeof periodos) ?? [];
    pagos = (rPagos.data as typeof pagos) ?? [];
  }

  const periodosList: PeriodoExpensa[] = periodos.map((p) => ({
    mes: p.mes,
    monto: Number(p.monto),
  }));

  const pagosMes = pagos.flatMap((p) =>
    (p.pagos_expensas_meses ?? []).map((m) => ({
      casa_id: p.casa_id,
      mes: m.mes,
      monto_mes: Number(m.monto_mes),
      vigente: m.vigente && p.estado === "vigente",
    }))
  );

  // Estados derivados del reloj: pagado / pagado_vencido / vencido / debe (Spec-005)
  const pagadoEnFecha = new Map<string, string>();
  for (const p of pagos) {
    if (p.estado !== "vigente") continue;
    for (const m of p.pagos_expensas_meses ?? []) {
      if (m.vigente) pagadoEnFecha.set(`${p.casa_id}|${m.mes}`, p.fecha_pago);
    }
  }
  const hoy = hoyAmericaLaPaz();
  const grilla: Record<string, Record<string, { estado: string; monto: number }>> = {};
  for (const casa of casas) {
    grilla[casa.id] = {};
    for (const per of periodos) {
      const pagado =
        pagosMes.find((x) => x.casa_id === casa.id && x.mes === per.mes && x.vigente)
          ?.monto_mes ?? null;
      grilla[casa.id][per.mes] = {
        estado: estadoMes({
          mes: per.mes,
          fechaLimite: per.fecha_limite ?? null,
          pagadoEnFecha: pagadoEnFecha.get(`${casa.id}|${per.mes}`) ?? null,
          hoy,
        }),
        monto: pagado ?? Number(per.monto),
      };
    }
  }

  const total = totalExpensas(
    pagos.map((p) => ({
      monto_total: Number(p.monto_total),
      vigente: p.estado === "vigente",
    }))
  );

  // Pagos por id para el detalle de celda
  const pagosPorCasaMes: Record<string, Record<string, typeof pagos[number]>> = {};
  for (const p of pagos) {
    if (p.estado !== "vigente") continue;
    pagosPorCasaMes[p.casa_id] ??= {};
    for (const m of p.pagos_expensas_meses ?? []) {
      if (m.vigente) pagosPorCasaMes[p.casa_id][m.mes] = p;
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <Pestanas />

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Expensas mensuales</h1>
          <a
            href="/panel/expensas/pagar"
            className="rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
          >
            Pagar mi expensa
          </a>
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase text-slate-400">
            Recaudado en expensas en la gestión
          </p>
          <p className="mt-1 text-2xl font-bold text-emerald-400">{formatBs(total)}</p>
        </div>

        {periodosList.length === 0 ? (
          <p className="mt-8 text-sm text-slate-400">
            {esResponsable
              ? "Aún no definiste el monto de ningún mes. Hazlo en la pestaña Casas → Configuración."
              : "El responsable todavía no definió períodos de expensa."}
          </p>
        ) : (
          <GrillaExpensas
            casas={casas}
            periodos={periodosList}
            grilla={grilla}
            pagosPorCasaMes={JSON.parse(JSON.stringify(pagosPorCasaMes))}
            esResponsable={esResponsable}
          />
        )}
      </div>
    </main>
  );
}
