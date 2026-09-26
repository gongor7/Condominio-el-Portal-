# Spec 002 — Correcciones de UI y validación OCR

## Contexto y objetivo
Tras la primera demo surgen 4 ajustes: eliminar emojis por iconos reales, renovar la portada con un carrusel moderno que rote las fotos del condominio, endurecer el flujo OCR (el monto escrito debe coincidir con el detectado en el comprobante, con confirmación explícita si difiere) y mostrar el porcentaje de avance con barra en todas las campañas.

## Usuarios / actores
Los mismos de Spec-001: vecino y responsable.

## Historias de usuario
- H1: Como visitante, quiero ver las fotos del condominio rotando en la portada con un diseño moderno, para conocer el condominio al entrar.
- H2: Como usuario (vecino o responsable), quiero que al subir un comprobante el sistema compare el monto del OCR con el que escribí, para evitar errores de tipeo.
- H3: Como vecino, quiero ver el porcentaje recaudado de cada campaña con una barra de progreso, para saber de un vistazo cómo vamos.

## Requisitos funcionales (EARS)
- RF-1: EL SISTEMA reemplaza todos los emojis de la interfaz por iconos SVG de `lucide-react`.
- RF-2: CUANDO el visitante está en la landing, EL SISTEMA rota automáticamente las 5 fotos del condominio en el hero (fundido suave cada ~5s) con recorte curvo/orgánico, manteniendo el botón de ingreso.
- RF-3: CUANDO el responsable sube una imagen y el OCR detecta un monto, EL SISTEMA prellena el textbox y compara en vivo; SI el monto editado difiere del detectado, ENTONCES muestra advertencia visible hasta que coincida o el usuario confirme explícitamente la discrepancia (decisión aprobada: confirmación, no bloqueo).
- RF-4: igual que RF-3 en el formulario de aporte de campaña (vecino).
- RF-5: CUANDO se lista una campaña con meta, EL SISTEMA muestra barra de progreso con porcentaje numérico; SI no tiene meta, ENTONCES muestra solo el total recaudado.

## Requisitos no funcionales
- `lucide-react` como única dependencia nueva. Carrusel sin librerías extra (CSS puro).

## Casos límite
- OCR sin monto detectado → campo manual con nota "sin lectura automática", sin comparación.
- PDF (sin OCR) → ídem.
- OCR lee monto erróneo → botón "el monto detectado está mal" permite continuar manual (queda registrado que se descartó el OCR).

## Fuera de alcance
Carga masiva de comprobantes históricos y reportes exportables (Spec-003).

## Criterios de finalización
Cero emojis en la UI; carrusel rotando; match OCR activo en ambos formularios; barras con % en panel y detalle; tests de la lógica de match en verde; build sin errores.

## Dudas abiertas
(Resueltas: discrepancia OCR → confirmación explícita, no bloqueo. Portada → carrusel con fundido.)
