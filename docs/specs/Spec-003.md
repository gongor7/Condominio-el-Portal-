# Spec 003 — Módulo de reservas del salón de eventos (v2, post-QA)

## Contexto y objetivo
El condominio alquila su salón de eventos a los vecinos como fuente de ingresos. Hoy las reservas se manejan de palabra o por WhatsApp y se pierden fechas, pagos y registros. Este módulo da un **calendario público** (landing) y detallado (panel) de la ocupación del salón, y una herramienta de administración para que el responsable registre reservas, cobros, vea cuánto recauda y saque un reporte mensual en PDF. Todo pago queda respaldado por comprobante validado contra el OCR (mecanismo de Spec-002).

## Usuarios / actores
- **Vecino**: ve el calendario (ocupado/libre en la landing; con detalles dentro del panel); no crea reservas.
- **Responsable (admin)**: crea reservas a nombre de vecinos, registra el pago con comprobante + validación OCR, anula (con devolución o retención), edita datos leves y consulta recaudación y reporte mensual.

## Historias de usuario
- H1: Como visitante, quiero ver en la landing qué fechas están ocupadas, sin necesidad de código.
- H2: Como vecino, quiero ver en el panel quién reservó y para qué evento, para contactar al vecino si me interesa la fecha.
- H3: Como responsable, quiero crear una reserva para una fecha libre a nombre de un vecino (pagada o gratuita), para que quede registrada y visible.
- H4: Como responsable, quiero registrar el pago subiendo el comprobante, con el monto validado contra el OCR.
- H5: Como responsable, quiero ver cuánto se recaudó por alquiler del salón y sacar el reporte mensual en PDF.
- H6: Como responsable, quiero anular una reserva eligiendo si el dinero se devuelve o se retiene, y liberar la fecha.
- H7: Como responsable, quiero corregir errores de tipeo (nombre, casa, descripción) sin anular la reserva.

## Requisitos funcionales (EARS)
- RF-1: CUANDO un visitante abre la landing, EL SISTEMA muestra un calendario mensual interactivo del salón con las fechas ocupadas destacadas (solo ocupado/libre, sin datos de quién), navegable por mes.
- RF-2: CUANDO un vecino con sesión abre el panel, EL SISTEMA muestra el mismo calendario con detalle por fecha: vecino, casa y descripción del evento de cada reserva vigente.
- RF-3: CUANDO el responsable crea una reserva, EL SISTEMA exige: vecino (nombre y casa), fecha libre (día completo), monto ≥ 0 y descripción opcional.
- RF-4: SI la fecha ya tiene una reserva vigente o es anterior al día actual (zona America/La_Paz), ENTONCES EL SISTEMA rechaza la creación con mensaje claro; la unicidad "una reserva vigente por fecha" también se garantiza en base de datos contra creaciones simultáneas.
- RF-5: CUANDO el monto es mayor a cero, EL SISTEMA exige el pago completo al crear: comprobante adjunto + monto validado contra el OCR (comparación en vivo con descarte explícito, igual que Spec-002), y registra automáticamente un ingreso contable en la gestión activa con categoría "alquiler salón".
- RF-6: CUANDO el monto es cero (evento comunitario), EL SISTEMA crea la reserva sin comprobante y sin movimiento contable, visible igualmente en el calendario.
- RF-7: MIENTRAS haya reservas vigentes, EL SISTEMA muestra al responsable el total recaudado por el salón en la gestión (excluyendo anuladas) y este total debe cuadrar exactamente con la suma de ingresos "alquiler salón" no anulados del libro contable.
- RF-8: CUANDO el responsable anula una reserva, EL SISTEMA exige motivo obligatorio y registra el tipo elegido: "con devolución" (anula el ingreso contable asociado) o "con retención" (el ingreso queda vigente); en ambos casos la reserva queda auditable, no borrada, y la fecha se libera.
- RF-9: SI la reserva pertenece a una gestión cerrada, ENTONCES su anulación registra el ajuste contable en la gestión activa (calendario global entre gestiones), dejando rastro de la reserva original.
- RF-10: CUANDO el responsable edita una reserva, EL SISTEMA solo permite modificar nombre, casa y descripción; fecha y monto requieren anular y recrear.
- RF-11: CUANDO el responsable pide el reporte mensual del salón, EL SISTEMA muestra por mes (zona America/La_Paz): cada reserva vigente (vecino, fecha, monto), las anuladas marcadas aparte, el total del mes y el acumulado de la gestión; y permite descargarlo en PDF.
- RF-12: EL SISTEMA solo permite crear, editar, anular y reportar reservas al rol responsable; visitantes y vecinos solo leen.

## Requisitos no funcionales
- Calendario responsive (móvil primero), implementación propia o librería liviana a decidir en el plan.
- Reutiliza OCR de Tesseract en el navegador y la subida a Supabase Storage existentes.
- Montos en Bs con formato boliviano; fechas en zona America/La_Paz.
- PDF generado sin servicios externos de pago.

## Casos límite
- Reserva para hoy mismo: permitida (el día actual no es "pasado").
- Dos reservas simultáneas para la misma fecha: la base de datos garantiza una sola (RF-4).
- OCR ilegible o PDF: monto manual con nota "sin lectura automática" (criterio Spec-002).
- Anulación con retención en gestión cerrada: ajuste en gestión activa (RF-9), auditable.
- 29 de febrero y cambios de mes: manejados por el calendario.
- Anticipación máxima: sin límite (se registra cualquier fecha futura).

## Fuera de alcance
- Solicitud de reserva por el vecino desde la app (solo el admin crea).
- Pagos parciales, anticipos o franjas horarias.
- Solicitantes externos al condominio.
- Notificaciones o recordatorios automáticos.
- Reportes de la contabilidad general (solo salón).

## Criterios de finalización
- Calendario en la landing (simple) y en el panel (con detalles) funcionando.
- Flujo responsable completo: reserva pagada con comprobante + OCR, y reserva gratuita.
- Ingreso contable automático por pago; anulación con devolución/retención coherente y auditable.
- Total del salón cuadrando contra el libro contable (verificado por test).
- Reporte mensual en pantalla y PDF descargable.
- Reglas puras (disponibilidad, unicidad, totales, anulación) con tests en verde; build sin errores.

## Dudas abiertas
(Ninguna: 7 decisiones de QA resueltas en entrevista + 5 correcciones editoriales aplicadas.)
