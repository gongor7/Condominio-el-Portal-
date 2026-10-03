# Tareas-006 — Cierre guiado, nueva gestión, WhatsApp y borrado (orden por dependencia)

- [x] T1: `GET /api/gestiones/estado-cierre` (responsable, 403/404) con campañas activas + multas impagas + vencidas La Paz (RF-1, RF-3)
  - Hecho cuando: sin sesión responsable → 403; sin activa → 404; con datos devuelve los 3 conteos correctos.
- [x] T2: Modal `CerrarGestion` con checklist y checkbox "Cerrarlas ahora" que bloquea/desbloquea confirmar (RF-2)
  - Hecho cuando: con campañas activas el botón exige el checkbox; sin pendientes muestra todo verde.
- [x] T3: `POST /api/gestiones` + UI `/panel/nueva-gestion` con SelectorCasas (RF-4, RF-5)
  - Hecho cuando: crea gestión sin activa y redirige; con activa → 409; casa inválida → 400.
- [x] T4: Celular por casa (`PATCH /api/expensas/casas` + UI inline agregar/editar) (RF-6)
  - Hecho cuando: guardar celular persiste y se muestra; sin celular muestra "Sin celular registrado".
- [x] T5: `src/lib/whatsapp.ts` + tests + botón "Avisar por WhatsApp" en modal multar (RF-7, RF-8)
  - Hecho cuando: `npm test whatsapp` verde; crear multa con celular muestra link wa.me válido.
- [x] T6: `DELETE /api/multas/[id]` solo impaga + botón `BorrarMulta` (RF-9, RF-10)
  - Hecho cuando: borrar impaga OK; borrar pagada → 409; pagada sigue anulándose con ajuste.
- [x] T7: Validación final: tests, lint, build, commit `bebe1c4`
  - Hecho cuando: `npm test` y `npm run build` en verde; documentado en Spec-006 retroactivo.
