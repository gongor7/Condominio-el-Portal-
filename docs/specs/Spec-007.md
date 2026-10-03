# Spec 007 — Registro manual con comprobante adjunto (eliminación del OCR)

## Contexto y objetivo
Commit `8a41d9b` (2026-10-02) eliminó el OCR del proyecto: Tesseract.js + pdf.js se retiran de todos los formularios por fricción, peso del bundle, y errores con montos bolivianos (1.500 vs 1,50). Se retro-documenta como Spec-007. Desde ahora el registro es manual con comprobante adjunto obligatorio/opcional según módulo.

## Usuarios / actores
- **Responsable**: registra movimientos y reservas con datos escritos a mano + archivo adjunto.
- **Vecino**: aporta a campañas, paga expensas y multas con datos escritos + archivo adjunto.

## Historias de usuario
- H1: Como usuario, quiero subir foto/PDF sin esperar lectura automática para publicar más rápido desde el celular.
- H2: Como responsable, quiero que el formulario no dependa de librerías pesadas para que la app cargue rápido.

## Requisitos funcionales (EARS)
- RF-1: CUANDO el usuario abre registrar/aporte/expensa/multa/salón, EL SISTEMA muestra campos manuales (monto, fecha, descripción) sin prellenado OCR ni advertencias de coincidencia.
- RF-2: CUANDO se adjunta archivo (imagen o PDF), EL SISTEMA lo sube a Storage (`/api/subir-archivo`) y guarda la URL; el archivo es evidencia, no fuente de datos.
- RF-3: EL SISTEMA ya no incluye `src/lib/ocr.ts`, `public/pdf.worker.min.mjs`, ni dependencias `tesseract.js` / `pdfjs-dist`; `package.json` queda sin esas entradas.
- RF-4: Los textos "sin lectura automática" / "monto detectado" desaparecen de la UI; el subtítulo pasa a "Adjunta el comprobante (foto o PDF)".
- RF-5: Las validaciones de negocio se mantienen: monto > 0, fecha válida, categoría, meses no duplicados (expensas), monto completo en multas, comprobante exigido donde ya lo era.
- RF-6: Los tests de OCR se retiran o simplifican: se elimina `ocr-monto.test.ts`, `contabilidad.ts` pierde helpers OCR, `ocr-match.test.ts` queda mínimo o se elimina.

## Requisitos no funcionales
- Bundle más liviano (se eliminan ~395 líneas de `package-lock` + worker de 29 líneas + 190 de `ocr.ts`).
- Sin regresión: `npm test` y `npm run build` en verde tras el retiro.

## Casos límite
- Foto borrosa → ya no aplica; el usuario escribe el monto y adjunta igual.
- PDF → se trata igual que imagen: solo adjunto.
- Comprobantes históricos con datos OCR descartado → se conservan tal cual.

## Fuera de alcance
- Reintroducir OCR en el futuro (requeriría nueva spec).
- Validación automática del monto contra el archivo.

## Criterios de finalización
- Cero referencias a `tesseract` / `pdfjs` / `ocr` en `src/` (salvo test residual documentado).
- Los 5 formularios (registrar, aporte, expensa, multa, salón) publican con datos manuales + subida OK.
- Tests y build en verde.

## Commits cubiertos
- `8a41d9b` refactor: eliminar OCR (tesseract + pdfjs) — registro manual con comprobante adjunto (2026-10-02). 14 archivos, +35/−1163.

## Nota de compatibilidad
Sustituye RF-3/RF-4 de Spec-002 (comparación OCR en vivo) y RF-4/RF-5 de Spec-003, RF-7/RF-9 de Spec-004, RF-3 de Spec-005 en lo referido a OCR. La exigencia de comprobante y confirmación humana (constitución #7) se mantiene: ahora toda la carga es humana.
