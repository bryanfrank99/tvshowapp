# Tasks: Proxy HLS/CORS para VIP Player (S20 PlayerFlix)

- [x] 1. Crear `app/api/playerflix/proxy/route.ts` con validación de whitelist, inyección de Referer y reescritura de playlists M3U8 → verificar: petición curl al proxy
- [x] 2. Actualizar `lib/playerflix.ts` para que `extractFromEmbedPlayer` use la URL de proxy → verificar: llamada a `fetchPlayerFlixStreams`
- [x] 3. Actualizar `scripts/test-playerflix-extractor.mjs` para validar que el stream de VIP Player es accesible y entrega cabeceras CORS → verificar: tests pasan 100%
- [x] 4. Ejecutar `npm run build` → verificar: compilación 100% verde
