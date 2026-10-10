/** Captcha propio (Spec: endurecimiento de acceso). Puro y testeable. */

export interface RetoCaptcha {
  pregunta: string;
  respuesta: string;
}

/** Suma/resta simple legible por humanos, molesta para bots. */
export function generarCaptcha(): RetoCaptcha {
  const a = 3 + Math.floor(Math.random() * 8); // 3..10
  const b = 2 + Math.floor(Math.random() * 8); // 2..9
  if (Math.random() < 0.5) {
    return { pregunta: `¿Cuánto es ${a} + ${b}?`, respuesta: String(a + b) };
  }
  const [mayor, menor] = a >= b ? [a, b] : [b, a];
  return { pregunta: `¿Cuánto es ${mayor} − ${menor}?`, respuesta: String(mayor - menor) };
}

/** Valida la respuesta tolerando espacios y ceros a la izquierda. */
export function validarCaptcha(respuestaDada: string, respuestaEsperada: string): boolean {
  const limpiar = (s: string) => s.trim().replace(/^0+(?=\d)/, "");
  return limpiar(respuestaDada) === limpiar(respuestaEsperada);
}
