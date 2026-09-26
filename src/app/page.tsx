import Image from "next/image";
import Link from "next/link";
import {
  BookOpenText,
  HandCoins,
  Scale,
  CalendarDays,
} from "lucide-react";
import { HeroCarrusel } from "./hero-carrusel";
import { SalonPublico } from "./salon-publico";

export const fotos = [
  { src: "/fotos/condominio-1.jpeg", alt: "Piscina del condominio El Portal" },
  { src: "/fotos/condominio-2.jpeg", alt: "Áreas comunes del condominio" },
  { src: "/fotos/condominio-3.jpeg", alt: "Condominio El Portal" },
  { src: "/fotos/condominio-4.jpeg", alt: "Vista del condominio El Portal" },
  { src: "/fotos/condominio-5.jpeg", alt: "Condominio El Portal de noche" },
];

export default function Landing() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Hero con carrusel */}
      <section className="relative h-[75vh] min-h-[520px] overflow-hidden">
        <HeroCarrusel fotos={fotos} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/60 via-transparent to-slate-950" />
        <div className="relative z-10 flex h-full flex-col items-center justify-center px-4 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-emerald-300">
            Transparencia total
          </p>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-6xl">
            Condominio El Portal
          </h1>
          <p className="mt-4 max-w-xl text-lg text-slate-200">
            Cada boliviano de nuestra gestión, a la vista de todos: ingresos,
            egresos y comprobantes en un solo lugar.
          </p>
          <Link
            href="/entrar"
            className="mt-8 rounded-full bg-emerald-500 px-8 py-3 text-lg font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400"
          >
            Entrar con mi código
          </Link>
        </div>
      </section>

      {/* Qué ofrece */}
      <section className="mx-auto max-w-5xl px-4 py-16">
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            {
              titulo: "Libro contable público",
              desc: "El responsable registra cada ingreso y egreso con su comprobante. Los vecinos lo ven todo.",
              icono: BookOpenText,
            },
            {
              titulo: "Recaudaciones claras",
              desc: "Campañas donde cada vecino sube su aporte y se ve en vivo cuánto se reunió y cuánto falta.",
              icono: HandCoins,
            },
            {
              titulo: "¿Sobró o faltó?",
              desc: "Al registrar los gastos, la plataforma muestra el saldo exacto de cada campaña.",
              icono: Scale,
            },
          ].map((c) => (
            <div
              key={c.titulo}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur"
            >
              <c.icono className="h-8 w-8 text-emerald-400" strokeWidth={1.8} />
              <h3 className="mt-3 text-lg font-semibold">{c.titulo}</h3>
              <p className="mt-2 text-sm text-slate-300">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Salón de eventos (RF-1: calendario público) */}
      <section className="mx-auto max-w-2xl px-4 pb-16">
        <div className="mb-6 flex items-center justify-center gap-2 text-2xl font-semibold">
          <CalendarDays className="h-6 w-6 text-emerald-400" />
          Salón de eventos
        </div>
        <SalonPublico />
      </section>

      {/* Galería */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <h2 className="mb-6 text-center text-2xl font-semibold">
          Nuestro condominio
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {fotos.slice(1).map((f, i) => (
            <div
              key={f.src}
              className={`relative overflow-hidden ${
                i % 2 === 0
                  ? "aspect-[4/5] rounded-tl-[2.5rem] rounded-br-[2.5rem]"
                  : "aspect-[4/5] rounded-tr-[2.5rem] rounded-bl-[2.5rem]"
              }`}
            >
              <Image
                src={f.src}
                alt={f.alt}
                fill
                sizes="(max-width: 640px) 50vw, 25vw"
                className="object-cover transition duration-500 hover:scale-105"
              />
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10 py-8 text-center text-sm text-slate-400">
        Condominio El Portal · Gestión transparente, vecinos tranquilos
      </footer>
    </main>
  );
}
