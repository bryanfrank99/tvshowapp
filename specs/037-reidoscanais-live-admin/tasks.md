# Tasks: Proveedor Rei dos Canais y Rediseño de Administración de Canales

- [x] 1. Extender `LiveSource` en `lib/providers.ts` y añadir `reidoscanais` en `public/providers.json` y `supabase/seed.sql`.
- [x] 2. Actualizar `app/api/live/list/route.ts` para autorizar los dominios `reidoscanais.st`, `api.reidoscanais.st` y `rdcanais.net`.
- [x] 3. Actualizar `app/live/page.tsx` para parsear los canales, categorías, logos, EPG y reproductor embed de Rei dos Canais.
- [x] 4. Crear endpoint de diagnóstico `app/api/admin/live/health-check/route.ts` y actualizar `app/api/admin/live/route.ts`.
- [x] 5. Actualizar la configuración de Capacitor y el cliente WebView de Android (`capacitor.config.ts`, `capacitor.config.json`, `AdBlockWebViewClient.java`).
- [x] 6. Rediseñar la pestaña de Live TV en `app/admin/page.tsx` para hacerla idéntica a la pestaña de servidores (diagnóstico ⚡, orden, badges, formato, acciones y formulario moderno con presets).
- [x] 7. Crear y ejecutar `scripts/test-reidoscanais-live.mjs` para verificar el flujo completo.
- [x] 8. Ejecutar `npm run build` para asegurar la compilación limpia.
