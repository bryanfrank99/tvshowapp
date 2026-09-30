# Tasks 062: Extractor de Stream Nativo para MegaEmbed (100% Android TV)

- [x] Task 1: Crear el módulo extractor `lib/megaembed.ts` para extraer streams directos HLS (.m3u8) desde MegaEmbed <!-- id: 062-task-1 -->
- [x] Task 2: Crear el endpoint de resolución directa `/api/megaembed/route.ts` <!-- id: 062-task-2 -->
- [x] Task 3: Integrar la extracción de MegaEmbed en `app/api/resolve/route.ts` inyectando la fuente nativa `type: "hls"` con alta prioridad <!-- id: 062-task-3 -->
- [x] Task 4: Instalar `hls.js` y actualizar `components/player/NativeSourcePlayer.tsx` para soporte universal (Android TV nativo + Desktop hls.js) <!-- id: 062-task-4 -->
- [x] Task 5: Configurar dominios de CDN en `AdBlockWebViewClient.java` y `capacitor.config.ts` <!-- id: 062-task-5 -->
- [x] Task 6: Crear script automatizado de pruebas `scripts/test-megaembed-extractor.mjs` y verificar extracción en películas y series <!-- id: 062-task-6 -->
- [x] Task 7: Ejecutar `npm run build` y suite de verificación <!-- id: 062-task-7 -->
