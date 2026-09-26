# Plan-003 — Módulo de reservas del salón de eventos (Spec-003 v2)

> `plan.md` corresponde a Spec-001 (completado); este plan cubre Spec-003.
> Sin código: módulos, datos, decisiones (con alternativa descartada), tests y cobertura RF.

## Módulos

### M1 `reservas-datos` — esquema e integridad (RF-3, RF-4, RF-8, RF-9)
Tabla `reservas` + transaccionalidad de creación.
- **Decisión A**: índice único parcial `create unique index on reservas(fecha) where estado='vigente'` para blindar la unicidad contra creaciones simultáneas.
  - *Descartada*: validar solo en la API — pierde contra dos requests concurrentes (QA-10).
- **Decisión B**: crear reserva+ingreso mediante función Postgres transaccional (`crear_reserva_con_ingreso`) invocada por RPC desde el servidor.
  - *Descartada*: dos inserts consecutivos desde la API — si el segundo falla queda fecha tomada sin ingreso o ingreso huérfano (viola constitución #9: descuadre = bug).

### M2 `calendario` — vista pública y de panel (RF-1, RF-2)
- **Decisión**: componente de calendario mensual propio (grid CSS) + API pública `GET /api/salon?mes=YYYY-MM` que para visitantes devuelve **solo fechas ocupadas** (sin nombres) y para sesiones iniciadas devuelve el detalle.
  - *Descartada*: librería tipo react-big-calendar — peso y estilos a re-pelear para lo que es una grilla de mes; *descartada* también la landing 100% estática: obligaría a re-desplegar para ver ocupación.
- Landing pasa a server-component dinámico solo para la sección calendario (o fetch cliente); panel reusa el mismo componente con detalle.

### M3 `reservas-admin` — ciclo de vida (RF-3, RF-5, RF-6, RF-8, RF-10, RF-12)
Formulario de creación (reutiliza el flujo OCR + comparación de monto de Spec-002), edición leve, anulación con tipo+motivo.
- **Decisión**: el comprobante se sube primero a Storage, y su URL + monto validado entran a la RPC transaccional; la reserva gratuita (monto 0) omite comprobante y crea solo la reserva.
  - *Descartada*: guardar comprobante dentro de la transacción — Storage no participa de transacciones SQL; se acepta el archivo huérfano posible si la RPC falla (sin efecto contable) y se documenta.
- Anulación (RF-8): `POST /api/salon/[id]/anular` con `tipo=devolucion|retencion` y motivo obligatorio; devolución anula el ingreso enlazado (`transaccion_id`), retención no lo toca. RF-9: si la reserva era de gestión cerrada, el ajuste contable (si aplica) se registra en la gestión activa.

### M4 `reporte-salon` — totales y PDF (RF-7, RF-11)
Página `/panel/salon/reporte` con selector de mes.
- **Decisión**: PDF mediante **hoja de impresión dedicada + `window.print()`** ("Guardar como PDF" nativo del navegador), sin dependencias.
  - *Descartada*: jsPDF/react-pdf — peso, licencias de fuentes y bugs de paginación para un reporte tabular que el motor de impresión del navegador resuelve gratis.
- El total de la gestión (RF-7) se calcula con la misma función pura que usa el reporte y se muestra también en el panel del salón.

### M5 `reglas-salon` — lógica pura (todos los RF)
Funciones puras en `src/lib/salon.ts`: `fechaDisponible(fecha, ocupadas, hoy, tz)`, `totalSalon(reservas)` (excluye anuladas y gratuitas), `agruparPorMes(reservas)`, `cuadraConLibro(totalSalon, ingresosCategoria)`.

## Modelo de datos (delta)
| Tabla | Definición |
|---|---|
| `reservas` | id, gestion_id→gestiones, fecha date, vecino_nombre, vecino_casa, monto numeric(12,2) ≥ 0, descripcion, estado text ('vigente'\|'anulada'), transaccion_id→transacciones (null si gratis), comprobante_url, anulado_motivo, anulado_tipo ('devolucion'\|'retencion'), anulado_en, creado_en |
| Índice | único parcial sobre (fecha) where estado='vigente' |
| Función | `crear_reserva_con_ingreso(...)` transaccional: inserta reserva y, si monto>0, el ingreso con categoría 'alquiler salón' y los enlaza |
| UI | categoría "alquiler salón" agregada al formulario de transacciones |

## Estrategia de tests
- **Vitest unit (reglas puras)**: disponibilidad (fecha ocupada/hoy/pasada/bisiesto), total excluyendo anuladas y gratis, agrupación mensual por zona America/La_Paz, cuadre salón↔libro (RF-7), tipos de anulación.
- **Vitest integración (con mock de Supabase)**: RPC de creación (pagada y gratuita), rechazo por fecha ocupada, anulación con retención vs devolución, edición solo de campos leves.
- **Manual**: calendario landing vs panel, impresión del PDF (navegador).
- Playwright queda fuera (constitución #10 no lo exige por módulo; se acumula para el pase completo).

## Cobertura RF
| RF | Módulo(s) | Tipo de verificación |
|---|---|---|
| RF-1 | M2 | manual + unit (datos que alimentan la grilla) |
| RF-2 | M2 | manual |
| RF-3 | M3, M5 | unit + integración |
| RF-4 | M1, M5 | unit + integración (índice único probado por diseño) |
| RF-5 | M3, M1 | integración + manual OCR |
| RF-6 | M3, M1 | integración |
| RF-7 | M4, M5 | **unit (cuadre con libro — obligatorio)** |
| RF-8 | M3 | integración |
| RF-9 | M3 | integración |
| RF-10 | M3 | integración |
| RF-11 | M4 | manual + unit (agrupación) |
| RF-12 | M2, M3 | integración (403/401) |
