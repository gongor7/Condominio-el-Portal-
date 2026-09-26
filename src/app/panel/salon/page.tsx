import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, Plus, FileBarChart } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase";
import { sesionActual } from "@/lib/auth";
import { formatBs } from "@/lib/contabilidad";
import {
  totalSalon,
  mesActualAmericaLaPaz,
  hoyAmericaLaPaz,
} from "@/lib/salon";
import { CalendarioSalon } from "@/app/calendario-salon";
import { ListaReservas } from "./lista-reservas";

export const dynamic = "force-dynamic";

export default async function SalonPage() {
  const sesion = await sesionActual();
  if (!sesion) redirect("/entrar");
  const esResponsable = sesion.rol === "responsable";

  const mes = mesActualAmericaLaPaz();
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

  const [{ data: reservasMes }, { data: todas }] = await Promise.all([
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

  const totalGestion = totalSalon(
    (todas ?? []).map((r) => ({
      id: r.id,
      fecha: r.fecha,
      monto: Number(r.monto),
      estado: r.estado as "vigente" | "anulada",
      vecino_nombre: r.vecino_nombre,
    }))
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <a href="/panel" className="text-sm text-emerald-300 hover:underline">
          ← Volver al panel
        </a>

        <div className="mt-3 flex items-center justify-between gap-3">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <CalendarDays className="h-6 w-6 text-emerald-400" />
            Salón de eventos
          </h1>
          {esResponsable && (
            <div className="flex gap-2">
              <Link
                href="/panel/salon/nueva"
                className="flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
              >
                <Plus className="h-4 w-4" /> Reservar
              </Link>
              <Link
                href="/panel/salon/reporte"
                className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-sm font-semibold hover:bg-white/10"
              >
                <FileBarChart className="h-4 w-4" /> Reporte
              </Link>
            </div>
          )}
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase text-slate-400">
            Recaudado por el salón en la gestión
          </p>
          <p className="mt-1 text-2xl font-bold text-emerald-400">
            {formatBs(totalGestion)}
          </p>
        </div>

        <div className="mt-6">
          <CalendarioSalon mesInicial={mes} hoy={hoyAmericaLaPaz()} />
        </div>

        <ListaReservas reservas={reservasMes ?? []} esResponsable={esResponsable} />
      </div>
    </main>
  );
}
