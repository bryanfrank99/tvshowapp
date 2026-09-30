# Tasks 061: Integración del Proveedor Cinecalidad (Iframe + AdBlock)

- [x] Task 1: Crear endpoint de redirección `/api/cinecalidad/route.ts` que consulte la API de Cinecalidad y redirija al embed HTML5 <!-- id: 061-task-1 -->
- [x] Task 2: Integrar soporte en `app/api/resolve/route.ts` para resolver dinámicamente las fuentes de Cinecalidad con metadatos de audio Latino <!-- id: 061-task-2 -->
- [x] Task 3: Registrar el proveedor `cinecalidad` (S15) en `supabase/seed.sql` con plantillas y URLs de comprobación de catálogo <!-- id: 061-task-3 -->
- [x] Task 4: Configurar hosts permitidos (`vimeos.net`, `goodstream.one`, `cinecalidad.am`) en `AdBlockWebViewClient.java` y `capacitor.config.ts` <!-- id: 061-task-4 -->
- [x] Task 5: Crear script automatizado de pruebas `scripts/test-cinecalidad-provider.mjs` y verificar disponibilidad y resolución <!-- id: 061-task-5 -->
- [x] Task 6: Ejecutar regresión y `npm run build` <!-- id: 061-task-6 -->
