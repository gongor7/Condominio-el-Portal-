# Spec 001 — MVP: Landing, gestiones, transacciones con OCR y campañas

## Contexto y objetivo
El condominio necesita transparencia sobre el dinero que administra el responsable de cada gestión (actual: Irrael Peñaranda Pardo, Casa 3) y una forma de recaudar fondos verificable. Esta spec cubre el MVP completo: landing pública, acceso por código, libro contable con comprobantes leídos por OCR y campañas de recaudación con aportes de vecinos. Hay 193 comprobantes PDF y 13 extractos mensuales existentes que servirán de datos iniciales de prueba.

## Usuarios / actores
- **Vecino**: accede con link + código del condominio; ve todo y aporta comprobantes en campañas.
- **Responsable**: código + PIN; además registra transacciones, crea campañas y cierra gestiones.

## Historias de usuario
- H1: Como vecino, quiero entrar con el código del condominio para ver todos los ingresos y egresos con sus comprobantes.
- H2: Como responsable, quiero subir un comprobante (foto/PDF) y confirmar los datos que el OCR extrajo para publicar una transacción.
- H3: Como responsable, quiero crear una campaña con meta para recaudar fondos para un gasto específico.
- H4: Como vecino, quiero subir mi comprobante de aporte y ver cuánto se recaudó, cuánto falta y quién aportó.
- H5: Como vecino, quiero ver si una campaña sobró o faltó dinero después de los gastos.
- H6: Como responsable, quiero cerrar mi gestión para que quede como histórico inmutable y arranque la siguiente.

## Requisitos funcionales (criterios de aceptación en EARS)
- RF-1: CUANDO un usuario abre la raíz del sitio, EL SISTEMA muestra una landing con las fotos del condominio y el ingreso por código.
- RF-2: CUANDO se ingresa el código de condominio válido, EL SISTEMA abre la vista de transparencia con la gestión activa.
- RF-3: CUANDO se ingresa un código inválido, EL SISTEMA muestra un error y no revela información.
- RF-4: CUANDO el responsable sube una imagen o PDF, EL SISTEMA ejecuta OCR en el navegador y prellena fecha, monto y descripción para confirmación.
- RF-5: SI el usuario no confirma los datos del OCR, ENTONCES EL SISTEMA no publica la transacción.
- RF-6: CUANDO se publica una transacción, EL SISTEMA exige fecha, monto > 0, tipo (ingreso/egreso) y categoría.
- RF-7: CUANDO un vecino aporta a una campaña, EL SISTEMA registra el aporte con su comprobante y actualiza el total recaudado en vivo.
- RF-8: MIENTRAS una campaña está activa, EL SISTEMA muestra meta, recaudado, faltante y lista de aportes.
- RF-9: CUANDO la campaña tiene gastos registrados, EL SISTEMA muestra el saldo (recaudado − gastado) indicando sobra/falta.
- RF-10: CUANDO el responsable cierra una gestión, EL SISTEMA la marca inmutable y permite crear la siguiente con nuevo responsable.
- RF-11: EL SISTEMA mantiene la auditoría: toda transacción/aporte guarda autor, fecha de creación y no se elimina físicamente.

## Requisitos no funcionales
- Responsive móvil primero (los vecinos entran desde el celular, fotos de WhatsApp incluidas).
- Interfaz en español; montos en Bs con formato boliviano.
- Plan gratuito: Supabase + Vercel; OCR 100% en cliente.

## Casos límite
- OCR ilegible (foto borrosa): campos vacíos, el usuario completa a mano.
- Aporte/transacción duplicada (mismo archivo): advertencia al usuario.
- Campaña sin meta definida: permite recaudación abierta (sin faltante).
- Gestión cerrada: intento de editar → rechazado con mensaje.
- Código de vecino compartido públicamente: aceptado por diseño (solo lectura + aportes).

## Fuera de alcance
- Pagos online, app nativa, multi-condominio, notificaciones push, recordatorios automáticos.

## Criterios de finalización
- RF-1..RF-11 con tests en verde (Vitest para reglas contables, Playwright para flujos H1, H2, H4).
- Carga manual de una muestra de comprobantes reales de `Comprobantes/` y verificación de OCR + publicación.
- `npm run build` sin errores.

## Dudas abiertas
(Resueltas: código de vecino fijo para el condominio; los aportes muestran nombre + monto público.)
