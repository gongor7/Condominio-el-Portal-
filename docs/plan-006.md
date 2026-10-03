# Plan-006 — Cierre guiado, nueva gestión, WhatsApp y borrado de multa (Spec-006)

> Sin código: módulos, datos, decisiones (con alternativa descartada), tests y cobertura RF.
> Base existente: gestiones con `cerrada`, campanas con `estado`, multas con `estado`, casas con 24 vecinos, `deudas.ts` + `salon.ts` para fechas La Paz.

## Módulos

### M1 `cierre-checklist` (RF-1, RF-2, RF-3)
- `GET /api/gestiones/estado-cierre` (responsable): cuenta campañas activas de la gestión activa, lista multas impagas globales (count + suma), calcula expensas vencidas (por cada período con `fecha_limite` vencida según `estadoMes`: casas activas − pagos vigentes de ese mes).
- UI `CerrarGestion` en `panel/acciones.tsx`: modal con 3 bloques (campañas / multas / vencidas), checkbox "Cerrarlas ahora" que desbloquea confirmar, nota opcional.
- **Decisión**: checklist informativo, no bloqueo total — multas y vencidas se heredan a la siguiente gestión (visibles y bloqueantes), solo las campañas activas bloquean salvo cierre en cascada elegido.
  - *Descartada*: bloquear cierre por cualquier pendiente — dejaría gestiones abiertas para siempre por deudas que por diseño no prescriben.

### M2 `nueva-gestion` (RF-4, RF-5)
- `POST /api/gestiones` (responsable): valida nombre/fecha (`esFechaValida`), resuelve responsable por `casa_id` (snapshot `vecino_nombre` + `Casa N`) o nombre libre; rechaza 409 si hay activa; `saldo_inicial` no numérico → 0.
- UI `/panel/nueva-gestion`: `SelectorCasas` + nombre/fecha/saldo.
- **Decisión**: snapshot del nombre del responsable igual que reservas/aportes.
  - *Descartada*: FK viva a `casas` — al renombrar la casa reescribiría quién fue responsable (constitución #8).

### M3 `whatsapp-celular` (RF-6, RF-7, RF-8)
- `casas.telefono` (columna existente o agregada vía PATCH): `PATCH /api/expensas/casas` acepta `telefono` y lo persiste.
- `src/lib/whatsapp.ts`: `normalizarTelefono` (8 → 591+8; 11 con 591; 12 con 0591; resto null) + `linkWhatsApp` (wa.me + texto encoded).
- Modal multar: tras crear muestra "Avisar por WhatsApp" si hay link válido.
- **Decisión**: link precargado, sin API de envío.
  - *Descartada*: integración con API de WhatsApp/Meta — costo y configuración fuera del plan gratuito (constitución #6).

### M4 `borrar-multa` (RF-9, RF-10)
- `DELETE /api/multas/[id]` (responsable): solo `impaga` → delete físico; resto → 409.
- UI `BorrarMulta` junto a `AnularMulta` en `casas-lista.tsx`.
- **Decisión**: borrado físico solo si no tocó dinero; lo pagado va a anulación con ajuste auditable.
  - *Descartada*: borrado genérico de cualquier multa — violaría integridad contable (constitución #8).

## Modelo de datos (delta)
| Tabla | Cambio |
|---|---|
| `casas` | usa `telefono text null` (celular por casa) |
| `gestiones` | sin cambio de schema (reusa `cerrada`, `fecha_cierre`, `cierre_nota`) |
| `multas` | sin cambio de schema (borrado físico solo impaga) |
| API nuevas | `GET estado-cierre`, `POST /api/gestiones`, `DELETE /api/multas/[id]`, `PATCH casas` extendido |

## Estrategia de tests
- **Vitest unit**: `whatsapp.test.ts` — 8 dígitos → 591+; con 591; con 0591; inválido → null; link encodea mensaje.
- **Manual/E2E**: checklist con los 3 estados; crear gestión con activa → 409; borrar impaga OK / pagada 409.

## Cobertura RF
| RF | Módulo | Verificación |
|---|---|---|
| RF-1, RF-2, RF-3 | M1 | manual + 403/404 |
| RF-4, RF-5 | M2 | manual (409 con activa) |
| RF-6, RF-7, RF-8 | M3 | **unit whatsapp** + manual |
| RF-9, RF-10 | M4 | manual (409 pagada) |
