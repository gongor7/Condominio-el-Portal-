/** Utilidades de WhatsApp para notificar multas (Spec-006). Sin dependencias. */

/** Normaliza un celular boliviano a formato wa.me (591 + 8 dígitos). */
export function normalizarTelefono(telefono: string | null | undefined): string | null {
  if (!telefono) return null;
  const digitos = telefono.replace(/\D/g, "");
  let completo: string;
  if (digitos.length === 8) {
    completo = `591${digitos}`; // celular boliviano sin lada
  } else if (digitos.length === 11 && digitos.startsWith("591")) {
    completo = digitos;
  } else if (digitos.length === 12 && digitos.startsWith("0591")) {
    completo = digitos.slice(1);
  } else {
    return null;
  }
  return completo;
}

/** Link de WhatsApp con mensaje precargado; null si el teléfono no es válido. */
export function linkWhatsApp(
  telefono: string | null | undefined,
  mensaje: string
): string | null {
  const n = normalizarTelefono(telefono);
  if (!n) return null;
  return `https://wa.me/${n}?text=${encodeURIComponent(mensaje)}`;
}
