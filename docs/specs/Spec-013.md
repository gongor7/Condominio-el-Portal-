# Spec 013 — Configuración de expensas en su pestaña y formulario entendible

## Contexto y objetivo
En Spec-005 la configuración de períodos de expensa se mudó a la pestaña Casas;
en la práctica al responsable le resulta ilógica ("cobrar expensas" se hace en
Expensas, no en Casas). Además, el selector de mes usaba `<input type="month">`,
que Firefox y varios navegadores móviles no soportan: el campo aparece vacío y
no se puede elegir mes ni año. Esta spec devuelve la configuración a la pestaña
Expensas y la rediseña para que funcione en cualquier navegador.

## Usuarios / actores
- **Responsable**: define el mes de cobro, monto y fecha límite desde la pestaña Expensas.
- **Vecino**: sin cambios (ve la grilla y paga desde "Pagar mi expensa").

## Historias de usuario
- H1: Como responsable, quiero definir la expensa del mes dentro de la pestaña Expensas, donde ya gestiono ese tema.
- H2: Como responsable, quiero elegir mes y año con listas desplegables que funcionen en cualquier navegador o celular.
- H3: Como responsable, quiero entender el formulario a la primera (qué es cada campo y un ejemplo).

## Requisitos funcionales (EARS)
- RF-1: CUANDO el responsable abre la pestaña Expensas, EL SISTEMA muestra el
  panel "Administración de expensas" (solo responsable); la pestaña Casas ya no
  muestra configuración de períodos (queda multar, teléfonos y detalle por casa).
- RF-2: CUANDO el responsable define un período, EL SISTEMA ofrece mes y año en
  listas desplegables (enero–diciembre; año actual y siguiente), monto por casa
  y fecha límite opcional con selector de día estándar.
- RF-3: EL SISTEMA muestra los campos como pasos numerados (① mes a cobrar,
  ② monto por casa, ③ fecha límite) con un ejemplo visible: "Ej.: noviembre
  2026 · 150 Bs · pagar hasta el 10 de diciembre".
- RF-4: CUANDO se publica el período, EL SISTEMA confirma con el mensaje
  "Mes publicado: <mes> <año> — <monto> Bs por casa" y el mes aparece en la
  grilla al instante.
- RF-5: Los períodos ya definidos, los pagos existentes y las APIs no cambian
  (misma tabla `periodos_expensas`, mismo endpoint `/api/expensas/periodos` con
  `mes` en formato yyyy-mm); cambio 100% de interfaz.
- RF-6: SI se intenta publicar un mes ya definido con otro monto y con pagos,
  ENTONCES se mantiene la advertencia de no-recálculo (Spec-004 RF-5).

## Requisitos no funcionales
- Sin `<input type="month">` en toda la app (compatibilidad total de navegadores).
- Sin cambios de esquema ni de datos; solo UI.

## Casos límite
- Año nuevo: la lista de años se arma dinámicica (año actual y siguiente).
- Mes ya definido: al elegirlo, el formulario carga su monto y fecha límite actuales para editarlos.
- Fecha límite vacía → el mes nunca vence (RF-7 de Spec-005).

## Fuera de alcance
- Cambios en pagos, grilla de estados o bloqueos (ya cubiertos por Spec-004/005).

## Criterios de finalización
- Panel visible solo para responsable en /panel/expensas; Casas sin configuración de períodos.
- Mes/año por listas desplegables funcionando en cualquier navegador.
- Publicar un mes lo muestra al instante en la grilla (verificación de solo lectura en prod).
- Suite, lint y build en verde; spec documentada; deploy a producción.
