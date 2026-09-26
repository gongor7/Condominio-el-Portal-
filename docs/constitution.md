# Constitución — Plataforma de Transparencia "Condominio El Portal" (v2, aprobada)

1. **Alcance**: plataforma web donde se registra la gestión del dinero del responsable de turno (elegido por gestión); todos los vecinos pueden ver todo.
2. **Gestiones**: cada gestión tiene responsable, período y cierre; al cambiar de responsable, la historia anterior queda pública e inmutable.
3. **Recaudaciones**: cualquier campaña de fondos permite que cada vecino suba su comprobante; la plataforma muestra en vivo cuánto se reunió, cuánto falta y quién aportó.
4. **Egresos**: el responsable sube comprobantes de gastos por OCR y la plataforma muestra si la campaña sobra o falta dinero.
5. **Roles**: al menos dos roles — responsable (edita) y vecino (ve y aporta comprobantes).
6. **Stack**: Next.js 14 + TypeScript + Tailwind; Supabase (Postgres + Storage); Tesseract.js (OCR en el navegador); Vercel. Sin costos recurrentes.
7. **OCR**: asistido + confirmación humana; nada se publica sin validación.
8. **Integridad**: cada transacción con fecha, monto, tipo, categoría, autor y adjunto; nada se elimina sin auditoría.
9. **Verificabilidad**: saldos y totales siempre cuadran (recaudado − gastado = disponible); descuadre = bug bloqueante.
10. **Tests**: reglas contables y de campañas cubiertas por tests automatizados (Vitest; e2e con Playwright).
11. **Límites (por ahora)**: sin pagos online integrados, sin app nativa.
12. **Proceso SDD**: Spec → Plan → Tareas → Implementación con aprobación en cada fase.
