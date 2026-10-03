# Tareas-008 — Edición auditada, vista por mes y renombre (orden por dependencia)

- [x] T1: Tests + `filtrarPorMes`, `saldoInicialMes`, `resumenMes` en `src/lib/contabilidad.ts` (RF-6, RF-7)
  - Hecho cuando: Vitest verde (8 tests) — filtro todo/mes, inicio sin/con previos, excluye anulados, `fin` cuadra con `saldoGestion`.
- [x] T2: Migración SQL: tabla `ediciones_transacciones` + índice (RF-3)
  - Hecho: `supabase/ediciones.sql` creado y delta v3 en `schema.sql`. **Pendiente del responsable: ejecutar `ediciones.sql` en Supabase → SQL Editor.** Sin esto, editar responde 500 y revierte el cambio (a propósito, para no perder auditoría).
- [x] T3: `PATCH /api/transacciones/[id]` con motivo obligatorio, validaciones, historial con rollback si falla + sync de `campana_gastos`; `GET ediciones` lectura para todos (RF-2, RF-3, RF-5, RF-8)
  - Hecho: E2E en vivo — anon 403/401, vecino 403, sin motivo 400, inexistente 404, monto/fecha inválidos 400, sin cambios ok vacío, cerrada 409. Happy path con escritura pendiente de T2.
- [x] T4: Libro UI — botones Editar/Anular solo responsable, modales, historial por fila visible a todos, bloqueo de reservadas con etiqueta de origen (RF-1, RF-4, RF-9)
  - Hecho: `src/app/panel/libro.tsx` integrado en `/panel`; vecino no ve botones.
- [x] T5: Filtro Todo + meses con tarjeta (inicio/ingresos/egresos/fin) en `/panel` (RF-6, RF-7)
  - Hecho en `libro.tsx` con `resumenMes` testeado en T1.
- [x] T6: Renombre UI a "Pagos extraordinarios" (tabs, landing, panel, formularios, errores API) sin tocar técnica (Terminología)
  - Hecho: cero "campaña(s)" visibles en `src/app` (solo comentarios internos); rutas, API y `src/lib`/tests intactos.
- [ ] T7: Validación final: suite completa, lint, build, E2E del ciclo editar→historial→mes, commit y push (todos los RF)
  - Hecho parcial: `npm test` (13 archivos/96 tests) y `npm run build` en verde; E2E de guardas OK. Falta: ejecutar T2 en Supabase y probar el ciclo completo editar→historial.
