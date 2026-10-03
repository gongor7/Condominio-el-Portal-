# Plan-007 — Retiro del OCR (Spec-007)

> Sin código: módulos, datos, decisiones, tests y cobertura RF.
> Base: formularios con OCR en vivo (Spec-002) + `src/lib/ocr.ts` (190 líneas) + `tesseract.js`/`pdfjs-dist`.

## Módulos

### M1 `formularios-manuales` (RF-1, RF-2, RF-4, RF-5)
- Simplifica 5 formularios: `panel/registrar`, `form-aporte`, `expensas/pagar`, `multas/[id]/pagar`, `salon/nueva` — quita estados OCR (`ocrMonto`, `ocrDescartado`, comparación en vivo) y deja `archivo + monto + fecha + descripción`.
- La subida a `/api/subir-archivo` no cambia.
- **Decisión**: mantener la subida de archivo como evidencia aunque ya no se lea.
  - *Descartada*: quitar también el adjunto — perdería la transparencia (constitución #8).

### M2 `deps-limpieza` (RF-3)
- Borra `src/lib/ocr.ts`, `public/pdf.worker.min.mjs`, deps de `package.json`/`package-lock.json`; quita helpers OCR de `src/lib/contabilidad.ts`.
- **Decisión**: borrado total, no flag.
  - *Descartada*: dejar OCR opcional tras flag — duplicaría caminos de validación y peso.

### M3 `tests-verde` (RF-6)
- Elimina `tests/ocr-monto.test.ts`; simplifica `ocr-match.test.ts`; quita casos OCR de `contabilidad.test.ts`.
- Verificación: `npm test`, `npm run lint`, `npm run build`.

## Modelo de datos
Sin cambios de schema. Solo código y dependencias.

## Estrategia de tests
- Unit: suite restante verde (whatsapp, contabilidad sin OCR, cierre, deudas, expensas, salón).
- Manual: publicar en los 5 formularios con foto y con PDF.

## Cobertura RF
| RF | Módulo | Verificación |
|---|---|---|
| RF-1, RF-2, RF-4, RF-5 | M1 | manual 5 formularios |
| RF-3 | M2 | `grep tesseract/pdfjs/ocr` vacío en src |
| RF-6 | M3 | `npm test` verde |
