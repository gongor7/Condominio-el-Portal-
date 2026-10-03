# Spec 008 — Edición auditada del libro y vista por mes

## Contexto y objetivo
El libro contable (`/panel`) hoy no tiene editar ni eliminar en la UI (solo existe
anular con motivo vía API, sin botón). El responsable necesita corregir montos y
comprobantes cargados con error, y los vecinos necesitan filtrar por mes viendo
con cuánto comenzó cada mes. Todo sin romper la auditoría (constitución #8) ni el
cuadre (constitución #9).

## Usuarios / actores
- **Responsable**: edita y anula movimientos del libro; filtra por mes.
- **Vecino**: filtra por mes; no ve ni puede usar editar/anular (ni UI ni API).

## Historias de usuario
- H1: Como responsable, quiero corregir el monto o el comprobante de un movimiento
  mal cargado, quedando registro de qué cambió.
- H2: Como responsable, quiero anular un movimiento con motivo desde el propio libro.
- H3: Como vecino, quiero elegir un mes y ver con cuánto comenzó, qué ingresó,
  qué egresó y en cuánto terminó.

## Requisitos funcionales (EARS)
- RF-1: CUANDO un responsable abre el libro, EL SISTEMA muestra botones
  Editar/Anular por fila; al vecino NO se le muestran (la API además responde 403).
- RF-2: CUANDO el responsable edita, EL SISTEMA exige motivo obligatorio y permite
  monto (> 0), fecha válida, categoría, descripción y reemplazo del comprobante
  (nueva subida a Storage); NO permite cambiar el tipo (ingreso/egreso).
- RF-3: CUANDO se confirma una edición, EL SISTEMA guarda el historial
  (campo, valor anterior, valor nuevo, autor, fecha, motivo) en
  `ediciones_transacciones` y cada fila ofrece "ver historial" visible para
  todos los roles (solo lectura para el vecino).
- RF-4: CUANDO el responsable anula desde el libro, EL SISTEMA exige motivo
  (reusa `POST /api/transacciones/[id]/anular`); la fila queda tachada y visible.
- RF-5: SI la gestión está cerrada o el movimiento ya está anulado, ENTONCES
  editar/anular se bloquean (409 + mensaje), igual que hoy.
- RF-6: CUANDO el usuario abre el libro, EL SISTEMA muestra filtro "Todo" (defecto)
  + meses con movimientos (ej. "octubre 2026"); al elegir un mes muestra tarjeta:
  Comenzó con X · Ingresos del mes · Egresos del mes · Saldo fin de mes.
- RF-7: EL SISTEMA calcula X como saldo inicial de la gestión + movimientos
  vigentes anteriores a ese mes (constitución #9: todo recalculado, nada manual).
- RF-8: CUANDO se edita el monto de un egreso vinculado a campaña, EL SISTEMA
  sincroniza `campana_gastos.monto` para que la campaña siga cuadrando.
- RF-9: Los movimientos de módulos con categoría reservada
  (expensas, multas, alquiler salón) NO son editables desde el libro: muestran su
  origen y se corrigen desde su módulo; anularlos desde el libro también se
  bloquea (descuadraría el módulo).

## Requisitos no funcionales
- Móvil primero; español; montos en Bs; edición en modal sin salir del libro.

## Casos límite
- Editar la fecha mueve el movimiento de mes → los resúmenes recalculan solos.
- Anular un movimiento ya anulado → 409 "Ya está anulado".
- Editar deja el historial aunque el movimiento luego se anule.
- Sin movimientos en un mes → el mes no aparece en el filtro.

## Fuera de alcance
- Borrado físico de movimientos (solo anulación, constitución #8).
- Editar el tipo ingreso/egreso (se anula y se recrea).
- Exportar el historial a PDF.

## Criterios de finalización
- Responsable edita (con historial visible) y anula con motivo desde el libro;
  vecino no ve los botones y la API le responde 403.
- Filtro Todo + meses con tarjeta de saldos que cuadra con el libro.
- Reglas puras (`saldoInicialMes`, `filtrarPorMes`, `resumenMes`) con tests en
  verde; `npm run build` sin errores.

## Terminología (vigente desde Spec-008)
El módulo "Campañas" pasa a llamarse **"Pagos extraordinarios"** en toda la
interfaz (títulos, botones, tarjetas, filtros). Los identificadores técnicos
(tabla `campanas`, rutas `/api/campanas`, `/panel/campanas`) NO cambian para no
romper links, API ni historial.

## Dudas abiertas
(Ninguna: 4 decisiones tomadas con el responsable — anulación vs borrado,
edición con historial, filtro Todo+mes, saldo acumulado calculado.)
