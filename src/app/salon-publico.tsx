"use client";

import { CalendarioSalon } from "./calendario-salon";
import { mesActualAmericaLaPaz, hoyAmericaLaPaz } from "@/lib/salon";

/** Sección pública de la landing (RF-1): calcula mes/hoy en el navegador para no congelar la página estática. */
export function SalonPublico() {
  const hoy = hoyAmericaLaPaz();
  return (
    <CalendarioSalon
      mesInicial={mesActualAmericaLaPaz()}
      publico
      hoy={hoy}
    />
  );
}
