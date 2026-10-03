"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const PESTANAS = [
  { href: "/panel", label: "Resumen" },
  { href: "/panel/campanas", label: "Pagos extraordinarios" },
  { href: "/panel/salon", label: "Salón" },
  { href: "/panel/expensas", label: "Expensas" },
  { href: "/panel/casas", label: "Casas" },
];

/** RF-1/RF-2: pestañas del panel, cada una con su ruta propia. */
export function Pestanas() {
  const path = usePathname();
  return (
    <nav
      className="flex gap-1 overflow-x-auto rounded-full border border-white/10 bg-white/5 p-1"
      aria-label="Secciones del panel"
    >
      {PESTANAS.map((t) => {
        const activa = path === t.href || (t.href !== "/panel" && path.startsWith(t.href));
        return (
          <Link
            key={t.href}
            href={t.href}
            prefetch={false}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              activa
                ? "bg-emerald-500 text-slate-950"
                : "text-slate-300 hover:bg-white/10"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
