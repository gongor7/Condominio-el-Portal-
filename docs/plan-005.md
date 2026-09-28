# Plan-005 — Multas, vencimientos, pestaña Casas y "contratado por todos" (Spec-005 v2)

> Sin código: módulos, datos, decisiones (con alternativa descartada), tests y cobertura RF.
> Base existente: `casas` (24 vecinos), `periodos_expensas`, `pagos_expensas*`, `reservas`, RLS lectura-solo-vía-API.

## Módulos

### M1 `multas-datos` — tabla y RPC (RF-1, RF-3, RF-4)
- **Decisión A**: la multa es una sola fila con estado (`impaga → pagada | anulada`) y los datos del pago embebidos (comprobante, fecha, ingreso enlazado).
  - *Descartada*: tabla separada `pagos_multas` estilo expensas — la multa se paga **una vez y completa** (RF-3), no hay multi-mes ni pagos parciales que descomponer.
- **Decisión B**: pago atómico por RPC `pagar_multa` (marca pagada + inserta ingreso "multas" + enlaza).
  - *Descartada*: update + insert sueltos — si falla el ingreso queda multa saldada sin dinero (constitución #9).
- Categoría "multas" reservada al módulo (fuera del select manual, como "expensas").

### M2 `deudas-reglas` — lógica pura en `src/lib/deudas.ts` (RF-5, RF-7, RF-10–RF-13)
- `estadoMes(mes, fechaLimite, pagadoEnFecha, hoyLaPaz)` → `pagado | pagado_vencido | vencido | debe`.
- `deudasCasa(casaId, multas, meses, periodos, hoyLaPaz)` → `{ bloqueada: boolean, motivos: string[] }` — motivo exacto: "multa impaga de X Bs por <motivo>" / "expensa de <mes> vencida el <fecha>".
- `totalMultas` + `cuadraConLibro` reutilizado (constitución #9).
- **Decisión**: el vencimiento se **deriva en cada lectura** (función del reloj), nunca se materializa.
  - *Descartada*: flag `vencido` persistido — quedaría desactualizado al pasar la medianoche o al cambiar la fecha límite (RF-13 exige recálculo gratis).

### M3 `salon-bloqueo-todos` — bloqueo y nueva modalidad (RF-5, RF-6, RF-8, RF-9)
- `/api/salon/crear` revalida en el servidor con `deudasCasa` **antes** de invocar la RPC; el 409 lista los motivos exactos.
- `reservas` gana `casa_id` (nullable) y `modalidad ('casa' | 'todos')`; la RPC acepta la modalidad:
  - `todos`: sin casa, sin monto, sin ingreso, sin bloqueo — solo el responsable puede crearla.
  - `casa`: **monto > 0 obligatorio** + comprobante (RF-8); gratuitas históricas quedan como están.
- **Decisión A**: reusar la tabla `reservas` con `casa_id` + copia de lectura (`vecino_nombre` como snapshot).
  - *Descartada*: tabla nueva de eventos comunitarios — duplicaría índice único de fecha, calendario y anulación.
- **Decisión B**: snapshot del nombre al reservar/aportar (casa_id + nombre copiado), no join en vivo.
  - *Descartada*: join siempre contra `casas` — al renombrar una casa reescribiría la historia de comprobantes (constitución #8).

### M4 `casas-tab` — pestaña Casas (RF-14, RF-15)
- `/panel/casas`: lista con resumen por casa (multas impagas, meses vencidos, expensas al día) y detalle expandido (períodos con estado pagado/debe/vencido/pagado-vencido, multas con estado, botón "Pagar multa").
- Responsable: multar (casa+motivo+monto), anular multa, y **la configuración de expensas se muda aquí** (períodos con fecha límite + admin de casas). La pestaña Expensas conserva su grilla (complementarias).
- **Decisión**: una sola página server-rendered con modales client para acciones.
  - *Descartada*: página por casa con ruta propia — 24 clics de navegación para el vecino que solo busca su estado.

### M5 `landing-multas` (RF-2)
- Sección pública en la landing: multas impagas (casa+motivo+monto), incluyendo las de gestiones anteriores.
- **Decisión**: endpoint público `GET /api/multas` (solo campos mínimos: casa, motivo, monto, fecha) + fetch cliente.
  - *Descartada*: server component en la landing — la forzaría 100% dinámica; mismo patrón ya usado con el calendario del salón.

### M6 `selectores-casa` (RF-16, RF-17)
- Componente `SelectorCasas` compartido; se aplica a: reserva de salón, aporte de campaña, pago de expensa (ya lo tiene), pago de multa.
- `aportes` gana `casa_id` nullable (los históricos muestran su nombre libre tal cual).

### M7 `multas-api-ui` (RF-1–RF-4)
- `POST /api/multas` (responsable): casa, motivo obligatorio, monto > 0.
- `POST /api/multas/[id]/pagar` (vecino): comprobante + OCR; **rechaza montos menores al de la multa** (revalidación server-side además del navegador); invoca RPC.
- `POST /api/multas/[id]/anular` (responsable): motivo; si estaba pagada → egreso de ajuste (gestión activa si la original cerrada).

## Modelo de datos (delta)
| Tabla | Cambio |
|---|---|
| `multas` (nueva) | id, gestion_id→gestiones, casa_id→casas, monto numeric > 0, motivo text, estado ('impaga'\|'pagada'\|'anulada'), fecha date, comprobante_url, fecha_pago, transaccion_id→transacciones, anulado_motivo, anulado_en, autor ('responsable' al crear) + índice (casa_id, estado) |
| `periodos_expensas` | + `fecha_limite date null` (null = nunca vence, RF-7) |
| `reservas` | + `casa_id uuid null`→casas, + `modalidad text default 'casa'` ('casa'\|'todos') |
| `aportes` | + `casa_id uuid null`→casas |
| RPC | `pagar_multa` (transaccional); `crear_reserva_con_ingreso` v2 acepta `p_casa_id` y `p_modalidad` |

## Estrategia de tests
- **Vitest unit (M2, base de todo)**: estadoMes (5 estados: pagado, pagado_vencido, vencido, debe, sin período; límite en el pasado; cambio de límite recalcula), deudasCasa (bloquea por multa impaga; bloquea por mes vencido; NO bloquea por debe sin límite; saldado no bloquea; motivos redactados), totalMultas + cuadre contra libro, validación de monto completo.
- **E2E en vivo (contra Supabase, con limpieza)**: multar → reservar salón da 409 con el motivo exacto → pagar multa con monto menor rechazado → pagar completo → reserva OK; expensa vencida bloquea y al pagarla se desbloquea; "contratado por todos" se crea sin ingreso y no se bloquea nunca; vecino no puede multar (403).
- **Manual**: landing con multas visibles, pestaña Casas, selectores en los 4 formularios.

## Cobertura RF
| RF | Módulo(s) | Verificación |
|---|---|---|
| RF-1 | M7 | E2E (403 vecino) |
| RF-2 | M5 | manual + E2E (API pública mínima) |
| RF-3 | M1, M7 | **unit (monto completo) + E2E** |
| RF-4 | M7 | E2E (ajuste contable) |
| RF-5 | M2, M3 | **unit (motivos) + E2E (409)** |
| RF-6 | M2 | E2E (desbloqueo al saldar) |
| RF-7 | M2 | **unit** |
| RF-8 | M3 | E2E (monto 0 rechazado en casa) |
| RF-9 | M3 | E2E (sin ingreso, sin bloqueo) |
| RF-10 | M4, M2 | E2E + manual |
| RF-11 | M2 | **unit** |
| RF-12 | M2 | **unit** (pagado_vencido) |
| RF-13 | M2 | **unit** |
| RF-14 | M4 | manual |
| RF-15 | M4 | manual + E2E (config mudada) |
| RF-16 | M6 | manual (4 formularios) |
| RF-17 | M6 | manual |
