"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Foto {
  src: string;
  alt: string;
}

const INTERVALO_MS = 5000;

/**
 * Carrusel del hero: fundido cruzado entre fotos con recorte curvo,
 * avanza solo y admite navegación manual (pausa temporal al interactuar).
 */
export function HeroCarrusel({ fotos }: { fotos: Foto[] }) {
  const [actual, setActual] = useState(0);
  const [pausado, setPausado] = useState(false);

  const ir = useCallback(
    (delta: number) =>
      setActual((a) => (a + delta + fotos.length) % fotos.length),
    [fotos.length]
  );

  useEffect(() => {
    if (pausado) return;
    const t = setInterval(() => ir(1), INTERVALO_MS);
    return () => clearInterval(t);
  }, [ir, pausado]);

  return (
    <div
      className="absolute inset-0"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      aria-roledescription="carrusel"
    >
      {fotos.map((f, i) => (
        <div
          key={f.src}
          className={`absolute inset-0 transition-opacity duration-[1500ms] ease-in-out ${
            i === actual ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden={i !== actual}
        >
          <Image
            src={f.src}
            alt={f.alt}
            fill
            priority={i === 0}
            sizes="100vw"
            className="scale-105 object-cover opacity-70"
            style={{
              borderRadius: "0 0 46% 46% / 0 0 18% 18%",
            }}
          />
          {/* velo inferior curvo */}
          <div
            className="absolute inset-0 bg-slate-950/20"
            style={{
              borderRadius: "0 0 46% 46% / 0 0 18% 18%",
              boxShadow: "0 0 0 9999px rgba(2,6,23,0)",
            }}
          />
        </div>
      ))}

      {/* Flechas */}
      <button
        onClick={() => ir(-1)}
        aria-label="Foto anterior"
        className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-slate-950/40 p-2 text-white backdrop-blur transition hover:bg-slate-950/70"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      <button
        onClick={() => ir(1)}
        aria-label="Foto siguiente"
        className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-slate-950/40 p-2 text-white backdrop-blur transition hover:bg-slate-950/70"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      {/* Puntos */}
      <div className="absolute bottom-24 left-1/2 z-20 flex -translate-x-1/2 gap-2 sm:bottom-28">
        {fotos.map((f, i) => (
          <button
            key={f.src}
            onClick={() => setActual(i)}
            aria-label={`Ir a foto ${i + 1}`}
            className={`h-2.5 rounded-full transition-all ${
              i === actual
                ? "w-7 bg-emerald-400"
                : "w-2.5 bg-white/40 hover:bg-white/70"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
