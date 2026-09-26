# Plan — Spec-001 (RF faltantes + hallazgos QA)

> Cubre RF-10, RF-11, RF-8 (transición de campaña), hallazgos QA 1, 3, 5, 9, 10, 14.
> Fuera de este plan (van a Spec-002): carga masiva histórica, reportes exportables, conciliación con extractos, límite de intentos de PIN.

## Módulos

### M1 `cierre-gestion` (RF-10, RF-11 parcial, QA 9/10/14/15)
Reglas y operación de cierre de gestión.
- **Datos**: reutiliza `gestiones.cerrada`; agrega `fecha_cierre` y `cierre_nota`. Restricción: solo una gestión con `cerrada=false` (validación en la API, no en SQL para permitir migraciones).
- **Decisión**: al cerrar, si hay campañas activas → **se bloquea el cierre** exigiendo cerrarlas primero.
  - *Alternativa descartada*: cierre en cascada de campañas — oculta estados intermedios al vecino y viola el espíritu de auditoría (#8).
- **Decisión**: escrituras sobre gestión cerrada (transacciones, aportes, gastos) rechazadas en las API routes, no solo ocultadas en la UI.
  - *Alternativa descartada*: RLS de Supabase — más robusto pero requiere service-role y migrar el cliente; se anota para Spec-002.
- **Tests**: unitarios de reglas puras (`puedeCerrarGestion`, `esInmutable`); e2e manual de rechazo de escritura.

### M2 `campanas-estado` (RF-8 transición, RF-9 presentación, QA 5/6)
Ciclo de vida de campaña: activa → cerrada.
- **Datos**: `campanas.estado` ya existe; agrega `cerrada_en`.
- **Decisión**: solo el responsable cierra; se permite cerrar con cualquier saldo, pero el cierre **congela aportes** y la UI muestra el veredicto final (sobra/falta/cuadra) con texto explícito.
  - *Alternativa descartada*: exigir saldo = 0 para cerrar — bloquearía campañas con sobrante legítimo.
- **RF-9**: saldo negativo se muestra como "Faltan X Bs por cubrir" (en rojo), positivo "Sobran X Bs".
- **Tests**: unitarios de transición y congelamiento.

### M3 `anulacion` (RF-11, QA 3)
Anulación con auditoría de transacciones, aportes y gastos.
- **Datos**: columnas `anulado`, `anulado_motivo`, `anulado_en` en las tres tablas (transacciones ya tiene las dos primeras).
- **Decisión**: solo el responsable anula, con motivo obligatorio; el registro permanece visible tachado.
  - *Alternativa descartada*: borrado lógico genérico con `deleted_at` — confunde "anulado contablemente" con "eliminado por error".
- **Tests**: unitarios (regla: anulado excluye del saldo) + API.

### M4 `pdf-sin-ocr` (RF-4, QA 1)
Aclaración de comportamiento: PDF se sube como adjunto sin prellenado OCR (Tesseract no lee PDF); la UI lo comunica.
- *Alternativa descartada*: convertir PDF→imagen en el servidor con pdf.js — agrega peso y dependencia; el volumen de PDFs es bajo y el confirmado manual es aceptable (constitución #7).

## Modelo de datos (delta)
| Tabla | Cambio |
|---|---|
| gestiones | + `fecha_cierre date`, + `cierre_nota text` |
| campanas | + `cerrada_en timestamptz` |
| aportes | + `anulado bool default false`, + `anulado_motivo text`, + `anulado_en timestamptz` |
| campana_gastos | igual que aportes |

## Estrategia de tests
- **Vitest (unit)**: reglas puras en `contabilidad.ts` — cierre, inmutabilidad, anulación, transición de campaña (RF-8/9/10/11).
- **API (Vitest, integración)**: rechazos de escritura sobre gestión cerrada y campaña cerrada — con cliente Supabase mockeado.
- **Manual/e2e**: flujos UI (cerrar gestión, anular con motivo) — Playwright queda para Spec-002 para no bloquear el avance.

## Cobertura RF
| RF | Cubierto por | Estado |
|---|---|---|
| RF-1..RF-7 | iteración anterior (tests existentes + manual) | ✅ |
| RF-8 | M2 (activa→cerrada, congelar) | este plan |
| RF-9 | M2 (presentación sobra/falta) | este plan |
| RF-10 | M1 (cierre + inmutabilidad) | este plan |
| RF-11 | M3 (anulación con motivo) | este plan |
| RF-4 (PDF) | M4 | este plan |
