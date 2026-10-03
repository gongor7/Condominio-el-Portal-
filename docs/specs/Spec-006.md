# Spec 006 — Cierre guiado, recambio de gestión, WhatsApp y borrado de multa impaga

## Contexto y objetivo
Dos commits implementados el 2026-10-02 quedaron sin spec (`bebe1c4`):
cierre de gestión con checklist, creación de nueva gestión desde el panel,
celular por casa con aviso por WhatsApp de multas, y borrado de multa impaga
creada por error. Esta spec los retro-documenta.

## Usuarios / actores
- **Responsable**: cierra la gestión, crea la siguiente, registra celulares, multa/borra/anula.
- **Vecino**: recibe aviso por WhatsApp (link generado por el responsable).

## Historias de usuario
- H1: Como responsable, quiero ver qué queda pendiente antes de cerrar (campañas activas, multas impagas, expensas vencidas) para no cerrar a ciegas.
- H2: Como responsable, quiero crear la siguiente gestión eligiendo al nuevo responsable de la lista de casas.
- H3: Como responsable, quiero registrar el celular de cada casa y avisar una multa por WhatsApp con un clic.
- H4: Como responsable, quiero borrar una multa impaga creada por error sin dejar rastro contable.

## Requisitos funcionales (EARS)
- RF-1: CUANDO el responsable pulsa "Cerrar gestión", EL SISTEMA muestra checklist desde `GET /api/gestiones/estado-cierre`: campañas activas (count), multas impagas (count + total Bs), expensas vencidas (celdas vencidas = casas activas − pagaron ese mes).
- RF-2: SI hay campañas activas, EL SISTEMA exige marcar "Cerrarlas ahora" para habilitar el botón confirmar; el cierre invoca `POST /api/gestiones/[id]/cerrar` con `{ nota, cerrar_campanas }`.
- RF-3: CUANDO no hay gestión activa, `GET estado-cierre` responde 404; solo rol responsable (403 en otro caso).
- RF-4: CUANDO el responsable crea gestión (`POST /api/gestiones`), EL SISTEMA exige nombre + fecha válida + responsable (casa de la lista con snapshot de nombre o nombre libre); SI ya hay activa responde 409; el saldo inicial negativo/NaN se guarda como 0.
- RF-5: La UI `/panel/nueva-gestion` usa `SelectorCasas` para elegir responsable, pide nombre/fecha/saldo, y redirige a `/panel` al crear.
- RF-6: CUANDO el responsable edita el celular (`PATCH /api/expensas/casas` con `telefono`), EL SISTEMA lo guarda por casa; la lista muestra "Sin celular registrado" si falta y permite agregar/editar inline.
- RF-7: EL SISTEMA genera link `https://wa.me/<591+8dígitos>?text=<mensaje>` vía `normalizarTelefono` + `linkWhatsApp` (`src/lib/whatsapp.ts`): acepta 8 dígitos, 11 con 591, 12 con 0591; otro formato → null (sin link).
- RF-8: Al crear una multa, el modal muestra botón "Avisar por WhatsApp" con mensaje precargado (casa, monto, motivo) si hay celular válido.
- RF-9: `DELETE /api/multas/[id]` SOLO borra multas `impaga` (responsable); pagada/anulada → 409 ("las pagadas se anulan"); inexistente → 404. El borrado es físico (sin auditoría) porque no tocó dinero.
- RF-10: Las multas pagadas siguen el camino de auditoría existente (anulación con egreso de ajuste), no borrado.

## Requisitos no funcionales
- Zona America/La_Paz para el cálculo de vencidas en el checklist (reusa `estadoMes` + `hoyAmericaLaPaz`).
- Sin dependencias nuevas; móvil primero; textos en español.

## Casos límite
- Cerrar sin campañas/multas/vencidas → checklist todo verde, cierre directo.
- Crear gestión con casa inexistente → 400 "Casa inválida".
- Teléfono inválido → no se genera link, se muestra solo el número.
- Borrar multa ya pagada → 409, se conserva historial.
- BD limpiada con backup (operativo, fuera de código): `.gitignore` ignora `backups/`.

## Fuera de alcance
- Envío automático de WhatsApp (solo link precargado, sin API de Meta).
- Edición del responsable de una gestión ya creada.
- Borrado parcial o de multas pagadas.

## Criterios de finalización
- Checklist muestra los 3 bloques con montos/motivos; cierre bloqueado sin checkbox si hay campañas activas.
- Nueva gestión creable solo sin activa; aparece en `/panel`.
- Celular guardable por casa; link wa.me válido con 8 dígitos.
- Multa impaga borrable; pagada rechazada con 409.
- Tests `whatsapp.test.ts` en verde; `npm run build` sin errores.

## Commits cubiertos
- `bebe1c4` feat: cierre de gestión con checklist, nueva gestión, celular por casa + WhatsApp de multas, borrar multa impaga (2026-10-02).
