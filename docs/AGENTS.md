# AGENTS.md — Plataforma de Transparencia "Condominio El Portal"

## Proyecto
Web app de transparencia contable para el condominio: el responsable del dinero de cada gestión publica ingresos/egresos con comprobantes leídos por OCR (Tesseract.js en el navegador) y los vecinos ven todo mediante link + código. Incluye campañas de recaudación donde cada vecino sube su comprobante de aporte y el sistema muestra recaudado / falta / sobra. Next.js 14 (App Router) + TypeScript + Tailwind CSS, Supabase (Postgres + Storage), Vitest y Playwright. Despliegue en Vercel.

## Comandos
- Ejecutar: `npm run dev`
- Tests: `npm test`
- Lint/formato: `npm run lint`

## Estilo y convenciones
- TypeScript estricto. Nombres de negocio en español (`gestion`, `campana`, `aporte`, `transaccion`); nombres técnicos en inglés (`useAuth`, `formatCurrency`).
- Código y comentarios en español; UI en español.
- Componentes pequeños y funcionales; Tailwind para estilos, móvil primero.

## Reglas
- Lee `docs/constitution.md` y la spec activa (`docs/specs/Spec-NNN.md`) antes de tocar código.
- No cambiar el esquema de Supabase ni agregar dependencias sin aprobación.
- Nunca exponer códigos/PINs en el cliente; nunca eliminar registros contables (solo anular con auditoría).
- No publicar datos del OCR sin confirmación humana.

## Al terminar cualquier tarea
- `npm run lint` y `npm test` en verde; `npm run build` sin errores si se tocó código de app.
