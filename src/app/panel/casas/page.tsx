import { redirect } from "next/navigation";
import { Home } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase";
import { sesionActual } from "@/lib/auth";
import { formatBs } from "@/lib/contabilidad";
import { estadoMes } from "@/lib/deudas";
import { hoyAmericaLaPaz } from "@/lib/salon";
import { Pestanas } from "../pestanas";
import { CasasLista } from "./casas-lista";
import { ConfigExpensas } from "../expensas/config-expensas";

export const dynamic = "force-dynamic";

export default async function CasasPage() {
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

  const [{ data: casasRaw }, { data: periodosRaw }, { data: multasRaw }, { data: pagosRaw }] =
    await Promise.all([
      db.from("casas").select("id, numero, vecino_nombre, telefono").eq("activo", true).order("numero"),
      gestion
        ? db.from("periodos_expensas").select("mes, monto, fecha_limite").eq("gestion_id", gestion.id).order("mes")
        : Promise.resolve({ data: [] as never[] }),
      db.from("multas").select("id, casa_id, monto, motivo, estado, fecha"),
      gestion
        ? db
            .from("pagos_expensas")
            .select("id, casa_id, monto_total, comprobante_url, fecha_pago, estado, pagos_expensas_meses(mes, monto_mes, vigente)")
            .eq("gestion_id", gestion.id)
            .order("creado_en", { ascending: false })
        : Promise.resolve({ data: [] as never[] }),
    ]);

  const casas = casasRaw ?? [];
  const periodos = periodosRaw ?? [];
  const multas = multasRaw ?? [];
  const pagos = pagosRaw ?? [];
  const hoy = hoyAmericaLaPaz();

  // Estado por casa: multas impagas y meses vencidos
  const pagadoEnFecha = new Map<string, string>();
  for (const p of pagos) {
    if (p.estado !== "vigente") continue;
    for (const m of p.pagos_expensas_meses ?? []) {
      if (m.vigente) pagadoEnFecha.set(`${p.casa_id}|${m.mes}`, p.fecha_pago);
    }
  }

  const casasEstado = casas.map((casa) => {
    const multasCasa = multas.filter((m) => m.casa_id === casa.id);
    const impagas = multasCasa.filter((m) => m.estado === "impaga");
    const meses = periodos.map((p) => {
      const est = estadoMes({
        mes: p.mes,
        fechaLimite: p.fecha_limite ?? null,
        pagadoEnFecha: pagadoEnFecha.get(`${casa.id}|${p.mes}`) ?? null,
        hoy,
      });
      return {
        mes: p.mes,
        monto: Number(p.monto),
        fecha_limite: p.fecha_limite,
        estado: est,
      };
    });
    const vencidos = meses.filter((m) => m.estado === "vencido").length;
    const debe = meses.filter((m) => m.estado === "debe" || m.estado === "vencido").length;
    const pagosCasa = pagos.filter((p) => p.casa_id === casa.id && p.estado === "vigente");
    return {
      casa,
      multas: multasCasa.map((m) => ({ ...m, monto: Number(m.monto) })),
      meses,
      resumen: {
        multasImpagas: impagas.length,
        totalImpago: impagas.reduce((a, m) => a + Number(m.monto), 0),
        mesesVencidos: vencidos,
        mesesDebe: debe,
        alDia: impagas.length === 0 && vencidos === 0,
      },
      pagosExpensas: pagosCasa.map((p) => ({
        id: p.id,
        monto_total: Number(p.monto_total),
        comprobante_url: p.comprobante_url,
        fecha_pago: p.fecha_pago,
        meses: (p.pagos_expensas_meses ?? []).map((m) => m.mes),
      })),
    };
  });

  const multasImpagasTotal = casasEstado.reduce((a, c) => a + c.resumen.multasImpagas, 0);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Pestanas />

        <div className="mt-6 flex items-center justify-between gap-3">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Home className="h-6 w-6 text-emerald-400" />
            Casas
          </h1>
          <p className="text-sm text-slate-400">
            {multasImpagasTotal > 0
              ? `${multasImpagasTotal} multa(s) impaga(s) en el condominio`
              : "Sin multas impagas"}
          </p>
        </div>

        {esResponsable && <ConfigExpensas casas={casas} />}

        <CasasLista casasEstado={JSON.parse(JSON.stringify(casasEstado))} esResponsable={esResponsable} />

        <p className="mt-6 text-xs text-slate-500">
          Estados derivados al {hoy} (America/La_Paz) · {formatBs(0) && ""}multas impagas
          bloquean la reserva del salón junto con expensas vencidas.
        </p>
      </div>
    </main>
  );
}
