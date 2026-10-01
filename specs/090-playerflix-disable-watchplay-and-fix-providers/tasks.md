# Tasks: Desactivar WatchPlay en S20 y Habilitar Proveedores Restantes

- [x] 1. Modificar `lib/playerflix.ts` para excluir opciones de `watchplay.shop` y estructurar VIP Player + Embed Play → verificar: script node de prueba
- [x] 2. Modificar `app/watch/page.tsx` para que la extracción de S20 use `GET /api/playerflix` en lugar de llamadas directas al origen → verificar: types en watch/page
- [x] 3. Modificar `app/api/resolve/route.ts` para generar fuentes de S20 tanto HLS como iframe sin WatchPlay → verificar: GET `/api/resolve`
- [x] 4. Actualizar `scripts/test-playerflix-extractor.mjs` para verificar ausencia de WatchPlay y presencia de proveedores alternativos → verificar: tests pasan 100%
- [x] 5. Ejecutar `npm run build` → verificar: compilación 100% verde
