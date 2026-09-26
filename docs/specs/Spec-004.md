# Spec 004 — Expensas mensuales y pestañas del panel (v2, post-QA)

## Contexto y objetivo
La cuota mensual (expensa) es el ingreso principal del condominio y hoy se controla en papel o WhatsApp: no se sabe de un vistazo quién pagó. Este módulo permite a **cada vecino subir su propio comprobante** y mantiene una **grilla pública** de pagos por casa y mes, con el monto mensual definido por el responsable. Además, el panel se reorganiza en **pestañas** porque ya acumula más de un módulo (resumen, campañas, salón, expensas).

## Usuarios / actores
- **Vecino**: ve la grilla pública de expensas y sube el comprobante de su pago.
- **Responsable**: define el monto mensual, administra la lista de casas, corrige/anula pagos.

## Historias de usuario
- H1: Como vecino, quiero ver qué casas pagaron el mes y cuáles no, para que la transparencia impulse el pago.
- H2: Como vecino, quiero subir el comprobante de mi expensa desde mi celular, con el monto validado por OCR, para que mi pago quede registrado al instante.
- H3: Como vecino atrasado, quiero pagar varios meses juntos con un comprobante, indicando cuántos meses cubro.
- H4: Como responsable, quiero definir el monto de la expensa de cada mes y la lista de casas, una sola vez.
- H5: Como responsable, quiero anular un pago registrado por error (con motivo, auditable).
- H6: Como usuario del panel, quiero pestañas para moverme entre Resumen, Campañas, Salón y Expensas sin perderme.

## Requisitos funcionales (EARS)
### Pestañas del panel
- RF-1: CUANDO un usuario con sesión abre el panel, EL SISTEMA muestra pestañas "Resumen", "Campañas", "Salón" y "Expensas"; cada pestaña conserva los roles (vecino ve, responsable edita).
- RF-2: CUANDO se navega entre pestañas, EL SISTEMA mantiene una URL propia por pestaña (`/panel`, `/panel/campanas`, `/panel/salon`, `/panel/expensas`) para compartir/enlazar cada sección.

### Configuración (responsable)
- RF-3: CUANDO el responsable define un período de expensas, EL SISTEMA registra mes (yyyy-mm), monto único para todas las casas y lo deja visible para todos.
- RF-4: CUANDO el responsable administra las casas, EL SISTEMA exige identificadores únicos ("Casa 1"…), permite agregar casas en cualquier momento y permite renombrarlas sin romper el histórico (el identificador interno persiste).
- RF-5: SI el responsable modifica el monto de un mes que ya tiene pagos, ENTONCES el sistema advierte que los pagos existentes conservan el monto con el que pagaron y no se recalculan.
- RF-6: EL SISTEMA reserva la categoría "expensas" exclusivamente al flujo de pagos de este módulo (no disponible en el formulario manual de transacciones), para evitar doble registro.

### Pago (vecino)
- RF-7: CUANDO un vecino paga, EL SISTEMA le exige elegir su casa de la lista, el/los meses a cubrir —solo el mes actual y meses atrasados ya vencidos, nunca meses futuros— y el comprobante; el monto se valida contra el OCR (comparación en vivo con descarte explícito, igual que Spec-002).
- RF-8: SI algún mes elegido ya está pagado por esa casa, ENTONCES el sistema BLOQUEA el pago con mensaje claro; la corrección la hace el responsable anulando el pago previo.
- RF-9: CUANDO el vecino elige sus meses, EL SISTEMA calcula el total esperado como la **suma de los montos de cada mes elegido** (los meses pueden tener montos distintos) y lo compara con el monto escrito; si difieren muestra advertencia que se resuelve corrigiendo el monto o confirmando la diferencia explícitamente. La validación OCR y la del total esperado se muestran juntas; ambas deben quedar resueltas para publicar.
- RF-10: CUANDO se confirma un pago, EL SISTEMA registra un ingreso contable por cada mes cubierto con categoría "expensas", monto proporcional al período correspondiente (el sobrante o faltante queda registrado en el último mes), **fecha del pago real**, comprobante y casa como autora; los meses quedan pagados en la grilla.
- RF-11: SI el monto pagado supera el total esperado, ENTONCES todo queda registrado como expensas con el monto real del comprobante (decisión: no se separa el sobrante).

### Grilla pública
- RF-12: CUANDO cualquier vecino abre la pestaña Expensas, EL SISTEMA muestra la grilla casas × meses de la gestión con estado por celda (pagado / debe / sin período definido), el total recaudado del mes y la lista de casas que no han pagado.
- RF-13: CUANDO se abre una celda pagada, EL SISTEMA muestra el comprobante, la fecha de registro y el monto con el que se pagó ese mes.

### Correcciones (responsable)
- RF-14: CUANDO el responsable anula un pago, EL SISTEMA exige motivo, libera todos los meses que cubría (no existe anulación parcial), anula los ingresos contables asociados y lo deja auditable.
- RF-15: SI el pago pertenece a una gestión cerrada, ENTONCES la anulación registra el ajuste (egreso devolución) en la gestión activa y libera los meses, con rastro del pago original (igual que el salón).
- RF-16: EL SISTEMA solo permite configurar períodos/casas y anular pagos al rol responsable; los vecinos solo pagan y consultan. El riesgo de que alguien pague a nombre de otra casa con el código compartido es **aceptado por diseño**: la grilla pública lo hace visible y el responsable puede anular.

## Requisitos no funcionales
- Grilla responsive móvil primero (scroll horizontal controlado en pantallas chicas).
- Reutiliza el flujo OCR y subida a Storage existentes; montos en Bs; zona America/La_Paz.
- El total de expensas visible cuadra con la suma de ingresos categoría "expensas" no anulados de la gestión activa (los ajustes de devolución son egresos y no afectan ese cuadre), verificado por test.

## Casos límite
- Casa paga enero+febrero y se anula el pago → ambos meses vuelven a "debe".
- Período definido sin monto aún → los vecinos no pueden pagar ese mes.
- Vecino se equivoca de casa → solo el responsable corrige (anular y volver a pagar).
- Pago mayor al esperado → permitido con advertencia; queda todo como expensas con monto real.
- Mes con monto cambiado después de pagos → pagos previos conservan su monto (RF-5).
- Pago multi-mes anulado → libera todos los meses del paquete, sin anulación parcial.
- Casa agregada a mitad de gestión → aparece en adelante; los meses previos muestran "sin período" para ella.
- Renombre de casa → el histórico se conserva (identificador interno estable).

## Fuera de alcance
- Cálculo de mora/recargos por atraso.
- Pago por adelantado de meses futuros (bloqueado por diseño).
- Carga de meses anteriores al arranque (queda en el Excel actual).
- Recordatorios o notificaciones automáticas.
- Expensas extraordinarias (se manejan como campañas, Spec-001).
- Reportes exportables de expensas (futuro spec).
- Código secreto por casa (riesgo de suplantación aceptado).

## Criterios de finalización
- Panel con 4 pestañas navegables por URL.
- Responsable configura monto mensual y lista de casas; vecino paga el mes o meses atrasados con comprobante validado por OCR.
- Grilla pública con estados por celda, comprobantes consultables y total del mes.
- Duplicados bloqueados; anulación con motivo libera meses, ajusta contabilidad y es auditable.
- Total de expensas cuadrando con el libro contable (verificado por test).
- Reglas puras (estados de celdas, meses pagables, total esperado multi-mes, duplicados, totales) con tests en verde; build sin errores.

## Dudas abiertas
(Ninguna: 6 decisiones de entrevista + 6 decisiones QA resueltas.)

## Apéndice: lista oficial de casas (semilla RF-4)
24 casas, entregadas por el responsable. Ya sembradas en la tabla `casas` de Supabase (`supabase/casas.sql`):

Casa 1 Silvia Trigo · Casa 2 Rydy Iliver Saavedra Pereira · Casa 3 Isrrael Peñaranda Pardo · Casa 4 Oswaldo Ariel Villaz · Casa 5 Rivera Vargas Jose · Casa 6 Orellana Laime Vaneza · Casa 7 Thaine Galindo Cinthia Valeria Andrea · Casa 8 Evelyn Eulalia Torrez Monasterios · Casa 9 Almanza Santa Cruz Marlen Gloria · Casa 10 Lizarazu Angulo Adriana · Casa 11 Fatima Zambrana · Casa 12 Jose Gerling Crespo · Casa 13 Salazar Arze Andry Carlos · Casa 14 Fatima Crespo Gonzales Prada · Casa 15 Carlos Marcelo Prado Loayza · Casa 16 Chirveches Iriarte Jose Alfonso · Casa 17 Herbas C Andrea · Casa 18 Daniel Richard Lozada Tordoya · Casa 19 Estela Mercado · Casa 20 Marcelo Ariel Telleria · Casa 21 Romelia Jessica Salazar · Casa 22 Diego Fernando Quir · Casa 23 Soriano Cardenas Litzi Daniela · Casa 24 Ana Maria Soliz
