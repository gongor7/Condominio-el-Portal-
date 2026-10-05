# Spec 009 — Pestaña Documentos (contratos y papeles)

## Contexto y objetivo
El condominio acumula contratos, escrituras y papeles físicos sin un lugar central.
Se agrega una pestaña "Documentos" donde el responsable sube PDFs/imágenes con
título y descripción, y todos los vecinos con sesión pueden verlos y abrirlos.
**Cambio 100% aditivo** (producción activa): tabla nueva `documentos` + bucket
nuevo `documentos`; ningún módulo existente se modifica.

## Requisitos funcionales (EARS)
- RF-1: CUANDO el responsable abre Documentos, EL SISTEMA permite subir archivo
  (PDF/JPG/PNG/WebP ≤10MB, vía `/api/subir-archivo` existente) con título
  obligatorio, categoría (contrato, escritura, plano, recibo, otro) y descripción opcional.
- RF-2: CUANDO cualquier usuario con sesión abre Documentos, EL SISTEMA lista los
  documentos (título, categoría, descripción, fecha, quién subió) del más nuevo al más viejo.
- RF-3: CUANDO se abre un documento, EL SISTEMA lo visualiza en un modal: imagen
  inline o PDF en iframe; y ofrece "abrir en pestaña nueva".
- RF-4: Solo el responsable sube y elimina (403 a vecinos en la API); eliminar
  quita el registro y el archivo del Storage.
- RF-5: Sin sesión, la API responde 401; nada de Documentos aparece en la landing.

## Fuera de alcance
Búsqueda/orden, versionado de contratos, firmas, notificaciones.

## Criterios de finalización
Pestaña en nav; subir→ver→eliminar funciona E2E en producción; vecinos ven sin
editar; suite/lint/build en verde; cero cambios en módulos existentes (diff solo aditivo).
