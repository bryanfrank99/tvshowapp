# Tasks 025: Control de Ventas, Cierres de Facturación y Suspensión por Morosidad

- [x] 1. Crear script SQL de migración [`supabase/migration_billing.sql`](file:///C:/Users/Administrator/.gemini/antigravity/scratch/tvshowapp/supabase/migration_billing.sql) → verificar sintaxis SQL e idempotencia (`if not exists`).
- [x] 2. Implementar módulo central de facturación [`lib/billing.ts`](file:///C:/Users/Administrator/.gemini/antigravity/scratch/tvshowapp/lib/billing.ts) → verificar funciones de cálculo, lectura de precios, registro transaccional y cortes.
- [x] 3. Integrar registro de transacciones en [`app/api/admin/codes/route.ts`](file:///C:/Users/Administrator/.gemini/antigravity/scratch/tvshowapp/app/api/admin/codes/route.ts) → verificar que `POST` (nuevo código) y `PATCH` (renovación y extensión) inserten registros en `code_transactions`.
- [x] 4. Crear API endpoint [`app/api/admin/billing/route.ts`](file:///C:/Users/Administrator/.gemini/antigravity/scratch/tvshowapp/app/api/admin/billing/route.ts) → verificar `GET` (balances y reportes) y `POST` (ajustes, cierre de período, marcar pagado, suspender códigos y reactivar).
- [x] 5. Agregar términos en [`lib/dict.ts`](file:///C:/Users/Administrator/.gemini/antigravity/scratch/tvshowapp/lib/dict.ts) para español, inglés y portugués (Constitución Regla 1).
- [x] 6. Diseñar interfaz en [`app/admin/page.tsx`](file:///C:/Users/Administrator/.gemini/antigravity/scratch/tvshowapp/app/admin/page.tsx) con la pestaña **"Finanzas"**, dashboards diferenciados para Superadmin y Sub-admin, y modales de confirmación.
- [x] 7. Ejecutar `npm run test:sources` y `npm run build` → verificar código 0 (éxito total).
- [x] 8. Prueba funcional end-to-end simulando ciclo de venta, generación de corte y suspensión por falta de pago.
