# Plan-008 — Edición auditada del libro, vista por mes y renombre a Pagos extraordinarios (Spec-008)

> Sin código: módulos, datos, decisiones (con alternativa descartada), tests y cobertura RF.
> Base existente: `transacciones` (con `anulado*`), `campana_gastos.transaccion_id`,
> `saldoGestion`/`totalesGestion` en `src/lib/contabilidad.ts`, subida en
> `/api/subir-archivo`, categorías reservadas (expensas, multas, alquiler salón).

## Módulos

### M1 `libro-mes` — reglas puras en `contabilidad.ts` (RF-6, RF-7)
- `filtrarPorMes(trans, mes: "yyyy-mm" | "todo")` → lista filtrada por `fecha.slice(0,7)`.
- `saldoInicialMes(trans, mes, saldoInicialGestion)` → saldo inicial + vigentes con
  fecha < primer día del mes (reusa lógica de `saldoGestion`).
- `resumenMes(...)` → `{ inicio, ingresos, egresos, fin }`; `fin` debe igualar el
  saldo calculado sobre todo el libro hasta fin de mes (constitución #9).
- **Decisión**: cálculo derivado en cada lectura, sin columnas de saldo por mes.
  - *Descartada*: persistir saldos mensuales — se desactualizaría al editar/anular
    (RF-2/RF-4 exigen recálculo gratis).

### M2 `editar-auditado` — API + historial (RF-2, RF-3, RF-5, RF-8)
- `PATCH /api/transacciones/[id]` (responsable): valida monto > 0, fecha válida
  (`esFechaValida`), gestión activa y no anulado; escribe cambios + inserta filas en
  `ediciones_transacciones` (transaccion_id, campo, anterior, nuevo, autor).
- Si el egreso tiene `campana_gastos` vinculado, actualiza su `monto` en la misma
  operación para que la campaña siga cuadrando (RF-8).
- **Decisión**: historial en tabla propia, no columnas snapshot en `transacciones`.
  - *Descartada*: `monto_anterior*` en la fila — solo guardaría la última edición
    y ensuciaría el schema contable.

### M3 `libro-ui` — botones, modal y filtro (RF-1, RF-4, RF-6, RF-9)
- `/panel`: botones Editar/Anular solo si responsable; modal editar (con subida de
  comprobante) y modal anular (motivo, reusa anular existente); fila con
  "ver historial"; filtro Todo + meses con tarjeta de saldos.
- Movimientos de categoría reservada: etiqueta de origen
  ("Expensa", "Multa", "Salón") sin botones de edición (RF-9).
- **Decisión**: modales client sobre el server component actual, mismo patrón que
  `CerrarGestion`/`ModalMultar`.
  - *Descartada*: páginas separadas de edición — más navegación para corregir un
    monto (móvil primero).

### M4 `renombre` — "Pagos extraordinarios" (Terminología)
- Solo etiquetas visibles (tabs, títulos, botones, tarjetas, emails de WhatsApp si
  los nombran); URLs, API, tablas y tests conservan `campana`.
- **Decisión**: renombre solo UI.
  - *Descartada*: renombre técnico completo (tablas/RPC/rutas) — migración y riesgo
    sin beneficio al vecino.

## Modelo de datos (delta)
| Tabla | Cambio |
|---|---|
| `ediciones_transacciones` (nueva) | id, transaccion_id→transacciones, campo text, anterior text, nuevo text, autor text default 'responsable', creado_en timestamptz default now() + índice (transaccion_id) |
| `transacciones` | sin cambios |
| `campana_gastos` | sin cambios (se sincroniza `monto` al editar) |

## Estrategia de tests
- **Vitest unit (M1)**: filtrarPorMes (todo/mes vacío/mes con datos), saldoInicialMes
  (sin previos, con previos, excluye anulados, suma saldo inicial), resumenMes
  cuadra contra `saldoGestion` (constitución #9).
- **E2E en vivo**: responsable edita monto → historial con anterior/nuevo; vecino
  edita → 403; editar en gestión cerrada → 409; anular exige motivo; mes muestra
  tarjeta que cuadra; reservada sin botones.
- **Manual**: reemplazo de comprobante visible; renombre en tabs y tarjetas.

## Cobertura RF
| RF | Módulo(s) | Verificación |
|---|---|---|
| RF-1 | M3 | E2E (403 vecino) + manual |
| RF-2 | M2, M3 | E2E |
| RF-3 | M2, M3 | E2E (historial) |
| RF-4 | M3 | E2E (motivo obligatorio) |
| RF-5 | M2 | E2E (409) |
| RF-6, RF-7 | M1, M3 | **unit + manual** |
| RF-8 | M2 | E2E (campaña recuadra) |
| RF-9 | M3 | manual + E2E |
| Terminología | M4 | manual |
