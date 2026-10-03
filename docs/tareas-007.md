# Tareas-007 — Retiro del OCR (orden por dependencia)

- [x] T1: Simplificar 5 formularios a registro manual + adjunto (RF-1, RF-2, RF-4, RF-5)
  - Hecho cuando: registrar/aporte/expensa/multa/salón publican sin UI de OCR; la subida a Storage sigue guardando URL.
- [x] T2: Borrar `src/lib/ocr.ts`, `public/pdf.worker.min.mjs` y deps tesseract/pdfjs de `package.json` (RF-3)
  - Hecho cuando: `grep -r tesseract|pdfjs src/` vacío; `npm install` sin esas deps.
- [x] T3: Actualizar tests (eliminar `ocr-monto`, simplificar `ocr-match` y `contabilidad`) (RF-6)
  - Hecho cuando: `npm test` verde sin tests OCR funcionales.
- [x] T4: Validación final: lint, build, commit `8a41d9b`
  - Hecho cuando: `npm run lint` y `npm run build` en verde; Spec-007 retroactiva creada.
