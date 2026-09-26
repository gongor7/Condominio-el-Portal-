# Plan-004 — Expensas mensuales y pestañas del panel (Spec-004 v2)

> Sin código: módulos, datos, decisiones (con alternativa descartada), tests y cobertura RF.
> `casas` ya existe en Supabase con los 24 vecinos oficiales (semilla Spec-004, apéndice).

## Módulos

### M1 `pestanas-panel` — reorganización de navegación (RF-1, RF-2)
Barra de pestañas compartida arriba del panel: Resumen, Campañas, Salón, Expensas.
- **Decisión A**: cada pestaña es una **ruta real** (`/panel`, `/panel/campanas`, `/panel/salon`, `/panel/expensas`) con un componente `Pestanas` reutilizable.
  - *Descartada*: pestañas con estado en una sola página (`?tab=`) — el salón ya es ruta propia, el botón "atrás" del navegador se rompe con tabs por estado y los enlaces directos (ej. "ver reserva del salón") quedan imposibles.
- El contenido actual de `/panel` (libro contable + campañas) se reparte: Resumen = saldos + libro; Campañas = listado + nueva campaña.

### M2 `expensas-datos` — esquema e integridad (RF-3, RF-4, RF-5, RF-8, RF-10, RF-14, RF-15)
Tablas `periodos_expensas`, `pagos_expensas`, `pagos_expensas_meses` + RPC transaccional.
- **Decisión A**: un **pago** (comprobante) descompone en **una fila por mes cubierto** (`pagos_expensas_meses`), cada una enlazada a su ingreso contable.
  - *Descartada*: un solo ingreso por comprobante con los meses en un array — rompe el cuadre mes a mes de la grilla y la anulación por mes sería imposible de auditar.
- **Decisión B**: unicidad de "casa+mes pagado" mediante índice único parcial en `pagos_expensas_meses (casa_id, mes) where vigente`, con columna `vigente` desnormalizada que la anulación voltea en cascada.
  - *Descartada*: validar duplicados solo en la RPC — dos vecinos pagando a la vez por el mismo mes de la misma casa pasarían (mismo problema QA-10 del salón).
- **Decisión C**: registro atómico por RPC `registrar_pago_expensas` (pago + meses + ingresos "expensas" con fecha real del pago, sobrante al último mes).
  - *Descartada*: inserts secuenciados desde la API — pago sin ingresos o meses sin pago si algo falla a mitad (constitución #9).
- Renombre de casas: update de `vecino_nombre` con `id` estable (RF-4). Cambio de monto con pagos existentes: permitido con advertencia (RF-5), no recalcula.

### M3 `expensas-reglas` — lógica pura en `src/lib/expensas.ts` (RF-7, RF-8, RF-9, RF-11, RF-12)
- `mesesPagables(hoy, periodos, mesesYaPagados)`: mes actual + atrasados definidos, sin pagados, sin futuros.
- `totalEsperado(mesesElegidos, periodos)`: **suma** de montos por mes (soporta multi-monto).
- `estadosGrilla(casas, periodos, pagos)`: pagado / debe / sin período por celda.
- `totalExpensas(pagos)` (excluye anulados) y `cuadraConLibro` reutilizable.
- `repartoMontos(montoPagado, mesesElegidos)`: prorrateo proporcional con ajuste del sobrante/faltante en el último mes (RF-10/RF-11).

### M4 `expensas-api` — endpoints (RF-7–RF-11, RF-14–RF-16)
- `GET /api/expensas` → casas + periodos + pagos (grilla; sesión requerida).
- `POST /api/expensas/pagar` (vecino): valida casa, meses pagables, duplicados (error 409), monto vs OCR (el navegador ya comparó; el servidor revalida contra el total esperado y exige `ocr_descartado` explícito si difiere), invoca RPC.
- `POST /api/expensas/[id]/anular` (responsable): motivo obligatorio, voltea `vigente` de los meses, anula ingresos (o egreso de ajuste en gestión activa si la original está cerrada, RF-15).
- `POST /api/expensas/periodos` y `PATCH /api/expensas/casas/[id]` (responsable): configuración.
- **Decisión**: el servidor revalida todo lo que el navegador validó.
  - *Descartada*: confiar en la validación del cliente — el código del condominio es compartido y cualquiera puede llamar la API directamente con curl.

### M5 `expensas-ui` — pestaña Expensas (RF-12, RF-13, RF-7–RF-9)
- Grilla casas × meses con scroll horizontal controlado en móvil, celda pagada clicable → comprobante/fecha/monto, totales por mes y lista de deudores.
- Formulario "Pagar mi expensa": selector de casa, checkboxes de meses pagables (deshabilitados los pagados), archivo con OCR, doble comparación (OCR + total esperado) con resolución explícita de ambas.
- Panel responsable: definir monto del mes, admin de casas (agregar/renombrar), anular pago con motivo.

## Modelo de datos (delta)
| Tabla | Definición |
|---|---|
| `periodos_expensas` | id, gestion_id→gestiones, mes text 'yyyy-mm' unique por gestión, monto numeric(12,2) > 0, creado_en |
| `pagos_expensas` | id, gestion_id, casa_id→casas, monto_total numeric > 0, comprobante_url, fecha_pago date, estado 'vigente'\|'anulado', anulado_motivo, anulado_en, autor default 'vecino', creado_en |
| `pagos_expensas_meses` | id, pago_id→pagos_expensas, casa_id (denormalizada), mes 'yyyy-mm', monto_mes numeric, transaccion_id→transacciones, vigente bool (se voltea al anular) |
| Índice | único parcial (casa_id, mes) where vigente |
| RPC | `registrar_pago_expensas` atómica; también quita "expensas" del formulario manual (RF-6, cambio en UI) |

## Estrategia de tests
- **Vitest unit (M3)**: meses pagables (futuro excluido, pagado excluido, sin período excluido), total esperado multi-monto, duplicados, reparto con sobrante/faltante, estados de grilla, cuadre con libro (descuadre detectado).
- **E2E en vivo (como en salón)**: RPC bloquea duplicado concurrente; pago multi-mes genera N ingresos con fecha real; anulación libera meses y anula ingresos; ajuste en gestión activa (simulado con gestión cerrada de prueba); configuración solo responsable (403 a vecino).
- **Manual**: grilla responsive, pestañas por URL, flujo completo del vecino con foto real.
- Playwright sigue acumulado para el pase completo (decisión de Spec-003).

## Cobertura RF
| RF | Módulo(s) | Verificación |
|---|---|---|
| RF-1, RF-2 | M1 | manual (rutas compartibles) |
| RF-3, RF-4, RF-5 | M2, M5 | E2E + manual |
| RF-6 | M5 | manual (categoría ausente del formulario) |
| RF-7 | M3, M4, M5 | **unit + E2E** |
| RF-8 | M2, M3 | **unit + E2E (índice parcial)** |
| RF-9 | M3, M5 | **unit** |
| RF-10 | M2 (RPC), M3 | E2E |
| RF-11 | M3 | unit |
| RF-12, RF-13 | M5 | manual |
| RF-14, RF-15 | M4 | E2E |
| RF-16 | M4 | E2E (403) |
