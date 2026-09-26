# Condominio El Portal — Plataforma de Transparencia

Web donde el responsable de cada gestión publica ingresos/egresos con comprobantes
leídos por OCR (en el navegador, sin costo) y los vecinos ven todo y aportan en
campañas de recaudación. Ver `docs/constitution.md` y `docs/specs/Spec-001.md`
en la carpeta raíz del proyecto.

## Puesta en marcha (una sola vez)

1. **Crear proyecto en Supabase** (gratis): https://supabase.com → New project.
2. **Base de datos**: en el dashboard, SQL Editor → pegar y ejecutar todo
   `supabase/schema.sql`. **Editar antes** el `codigo_vecino` (ej. `PORTAL2025`)
   y el `pin_responsable` (ej. `4821`) del INSERT final.
3. **Almacenamiento**: Storage → New bucket → nombre `comprobantes`, público
   (Public bucket).
4. **Credenciales**: Settings → API. Copiar `Project URL` y la `anon public key`
   en `.env.local` (reemplazar los placeholders) y definir un `AUTH_SECRET`
   largo y aleatorio.
5. **Ejecutar local**: `npm install && npm run dev` → http://localhost:3000
6. **Desplegar a Vercel**: subir el repo a GitHub → vercel.com → Import →
   agregar las 3 variables de entorno en Settings → Deploy.

## Uso

- **Vecinos**: reciben el link + código → ven libro contable y campañas.
- **Responsable**: mismo código + su PIN → además registra movimientos
  (`/panel/registrar`, con OCR) y crea campañas (`/panel/nueva-campana`).

## Comandos

- Desarrollo: `npm run dev`
- Tests: `npm test`
- Lint: `npm run lint`
- Producción: `npm run build && npm start`
