# Spec 005 — Multas, vencimiento de expensas y pestaña Casas (v2, post-QA)

## Contexto y objetivo
El condominio necesita un mecanismo de consecuencias para los incumplimientos: hoy una casa puede deber expensas o generar molestias sin efecto práctico. Esta spec agrega **multas con motivo obligatorio**, hace visible la deuda en la landing, **bloquea la reserva del salón** a casas con multa impaga o expensa vencida, pone **fecha límite de pago** a cada período, centraliza el estado por vecino en una nueva **pestaña Casas**, reemplaza los campos de nombre libre por **selectores de casas** y elimina las reservas gratuitas del salón en favor de la modalidad **"contratado por todos"**.

## Usuarios / actores
- **Vecino**: ve su estado en la pestaña Casas; paga sus multas con comprobante; elige su casa desde lista en todos los formularios.
- **Responsable**: multa con motivo, define fechas límite, marca eventos "contratado por todos", administra casas.
- **Visitante**: ve en la landing qué casas están multadas y por qué.

## Historias de usuario
- H1: Como responsable, quiero multar a una casa registrando motivo y monto, para que las faltas tengan consecuencia formal.
- H2: Como visitante/vecino, quiero ver en la landing qué casas tienen multas impagas y por qué.
- H3: Como responsable, quiero que el salón no se reserve a casas con multa impaga o expensa vencida.
- H4: Como responsable, quiero definir la fecha límite de pago de cada expensa.
- H5: Como vecino, quiero pagar mi multa subiendo mi comprobante con OCR.
- H6: Como vecino, quiero entrar a la pestaña Casas, elegir mi casa y ver mi estado completo.
- H7: Como usuario, en todo formulario donde se pide el vecino quiero elegir la casa de una lista.
- H8: Como responsable, quiero marcar un evento del salón como "contratado por todos" para actividades comunitarias donde participa el condominio entero.

## Requisitos funcionales (EARS)

### Multas
- RF-1: CUANDO el responsable crea una multa, EL SISTEMA exige casa (de la lista), motivo obligatorio y monto > 0, y la registra como **impaga** con fecha y autor responsable.
- RF-2: CUANDO hay multas impagas, EL SISTEMA las muestra en la landing pública con casa, motivo y monto; las multas impagas **siguen vigentes aunque cambie la gestión** (la deuda no prescribe al cerrar).
- RF-3: CUANDO el vecino paga su multa, EL SISTEMA exige comprobante validado por OCR y **monto completo** (un pago menor se rechaza con mensaje claro); al confirmar registra el ingreso contable con categoría "multas" (reservada al módulo, no disponible en el formulario manual) con la casa como autora.
- RF-4: CUANDO el responsable anula una multa impaga, EL SISTEMA exige motivo y la deja auditable; SI la multa ya estaba pagada, ENTONCES la anulación registra egreso de ajuste (en la gestión activa si la original está cerrada), auditable.

### Bloqueo del salón
- RF-5: SI la casa que va a reservar tiene multa impaga o expensa **vencida**, ENTONCES EL SISTEMA rechaza la reserva indicando exactamente la deuda; el bloqueo aplica solo a **nuevas reservas** (las existentes se mantienen) y se revalida en el servidor.
- RF-6: CUANDO la casa salda su deuda, EL SISTEMA vuelve a permitir la reserva inmediatamente.
- RF-7: Un mes debido cuyo período **no tiene fecha límite** no vence y por esa vía no bloquea (solo se muestra como "debe").

### Salón: sin gratuitas, modalidad "por todos"
- RF-8: CUANDO el responsable reserva el salón para una casa, EL SISTEMA exige monto > 0 con comprobante (las reservas gratuitas de casa quedan eliminadas; las existentes se conservan como histórico).
- RF-9: CUANDO un evento es del condominio entero, EL SISTEMA permite al responsable marcar la reserva como **"contratado por todos"**: sin casa, sin monto, sin ingreso contable, visible en el calendario y **no bloqueada por deudas**.

### Vencimiento de expensas
- RF-10: CUANDO el responsable define un período de expensa, EL SISTEMA le permite fijar la **fecha límite de pago** (evaluada en zona America/La_Paz); definirla en el pasado se advierte pero se permite.
- RF-11: MIENTRAS la fecha actual supere la fecha límite de un mes impago, EL SISTEMA marca el mes como **vencido** (distinto de "debe") en grillas y pestaña Casas, y bloquea el salón (RF-5).
- RF-12: SI el mes se paga después de su límite, ENTONCES queda como "pagado (vencido)" — visible en historial, ya no bloquea.
- RF-13: CUANDO se cambia una fecha límite, EL SISTEMA recalcula los estados de vencimiento.

### Pestaña Casas
- RF-14: CUANDO un usuario con sesión abre la pestaña Casas, EL SISTEMA muestra la lista de casas con estado resumido (expensas al día/vencidas, multas impagas) y el detalle por casa: períodos pagados/debe/vencido, multas con estado e historial de pagos.
- RF-15: CUANDO el responsable abre una casa, EL SISTEMA le permite multarla, anular multas y administrar (agregar/renombrar casas, definir períodos con fecha límite — la configuración de expensas se traslada aquí). La grilla casas×meses de la pestaña Expensas se mantiene: **complementarias** (Expensas = vista por mes, Casas = vista por vecino).

### Selectores de casa
- RF-16: CUANDO cualquier formulario pida identificar al vecino (reserva de salón, aporte a campaña, pago de expensa, pago de multa), EL SISTEMA ofrece el selector de casas registradas en lugar de texto libre; los aportes históricos con nombre libre se muestran tal cual fueron registrados.
- RF-17: SI no hay casas registradas, ENTONCES los formularios lo indican y solo el responsable puede continuar tras registrar casas.

## Requisitos no funcionales
- Bloqueo (RF-5) revalidado en el servidor; zona America/La_Paz para vencimientos; montos en Bs.
- Reutiliza OCR (imágenes y PDFs), Storage y patrones de auditoría existentes.
- El total de multas visible cuadra con el libro contable (categoría "multas"), verificado por test (constitución #9).

## Casos límite
- Casa con deuda que reserva a nombre de otra: riesgo aceptado por diseño (visible en grillas públicas).
- Pago parcial de multa: rechazado (RF-3).
- Multa creada cuando la casa ya tiene reserva futura: la reserva se mantiene (RF-5).
- Multa impaga entre gestiones: sigue vigente, visible y bloqueante (RF-2).
- Multa pagada y anulada por error: egreso de ajuste auditable (RF-4).
- Período creado con fecha límite pasada: advertido y permitido (queda vencido de inmediato).
- Cambio de fecha límite: estados recalculados (RF-13).
- "Contratado por todos" no tiene casa: no figura en grillas de deuda ni bloquea nada.

## Fuera de alcance
- Multas automáticas por vencimiento o recargos porcentuales.
- Suspensión de beneficios además del salón.
- Notificaciones o recordatorios automáticos.
- Fecha límite para pagar la propia multa (bloquea indefinidamente hasta pagar).

## Criterios de finalización
- Responsable multa con motivo; landing muestra multas impagas (casa+motivo+monto) incluyendo gestiones anteriores.
- Reserva del salón rechazada por multa impaga o expensa vencida con mensaje exacto de la deuda; solo nuevas reservas; desbloqueo al saldar.
- Períodos con fecha límite; "debe" vs "vencido" vs "pagado (vencido)" distinguibles.
- Vecino paga multa completa con comprobante OCR; ingreso "multas" generado; anulación auditable con ajuste.
- Pestaña Casas: lista con estado, detalle por casa, multar/anular, config trasladada; Expensas mantiene su grilla.
- Todos los formularios usan selector de casas; "contratado por todos" disponible para el salón.
- Reglas puras (vencimiento, bloqueo, totales, cuadre multas↔libro) con tests en verde; build sin errores.

## Dudas abiertas
(Ninguna: 6 decisiones de entrevista + 6 decisiones QA resueltas; 6 correcciones editoriales aplicadas.)

## Nota de compatibilidad
Este spec **sustituye el RF-6 de Spec-003** (reservas gratuitas): en adelante, eventos comunitarios = "contratado por todos" (RF-9); las gratuitas históricas se conservan como están.
