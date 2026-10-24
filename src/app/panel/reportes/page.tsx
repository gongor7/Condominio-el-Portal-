import { redirect } from "next/navigation";
import { FileSpreadsheet } from "lucide-react";
import { sesionActual } from "@/lib/auth";
import { Pestanas } from "../pestanas";
import { ReportesCliente } from "./reportes-cliente";

export const dynamic = "force-dynamic";

export default async function ReportesPage() {
  const sesion = await sesionActual();
  if (!sesion) redirect("/entrar");

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Pestanas />

        <div className="mt-6 flex items-center gap-2">
          <FileSpreadsheet className="h-6 w-6 text-emerald-400" />
          <h1 className="text-2xl font-bold">Reportes Excel</h1>
        </div>
        <p className="mt-1 text-sm text-slate-300">
          Copia completa de la base de datos en un archivo Excel: gestiones,
          transacciones, casas, expensas, multas, reservas, campañas, aportes y
          documentos, con una hoja de resumen.
        </p>

        <ReportesCliente esResponsable={sesion.rol === "responsable"} />
      </div>
    </main>
  );
}
