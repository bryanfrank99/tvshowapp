# Spec 068: Extractor Nativo HLS para Servidor S18 (WatchPlay)

## 1. Contexto y Problema
El usuario ha solicitado verificar e implementar la extracción nativa para el servidor S18 basado en `https://v2.watchplay.shop/movie/{id}`.
Tras el análisis técnico previo se comprobó que:
- El servidor `v2.watchplay.shop` expone en el código fuente de `/movie/{id}` un stream HLS directo fMP4 (`playlist.m3u8`) alojado en la red CDN `hclod.qzz.io`.
- El CDN responde con cabeceras CORS abiertas (`Access-Control-Allow-Origin: *`) y segmentos fragmentados (`.js` tipo fMP4 `stypmsdh`) que funcionan al 100% en `NativeSourcePlayer` mediante Hls.js y reproductores nativos.
- Es compatible tanto con IDs de TMDB como de IMDb.
- El catálogo incluye audio en Português (Dublado).
- Se requiere crear el extractor nativo, integrarlo con la caché de BD de streams, la API de resolución y el reproductor nativo.

## 2. Requerimientos
1. **Módulo Extractor `lib/watchplay.ts`**:
   - Función `fetchWatchPlayStream(params: { id: string; type: "movie" | "tv"; season?: number; episode?: number })`.
   - Consulta `https://v2.watchplay.shop/movie/{id}` (o fallback a IMDb si se provee).
   - Extrae la URL de `playlist.m3u8` limpia y verifica su validez.
   - Retorna `{ success: true, hlsUrl, type: "hls", lang: "pt" }`.
2. **Endpoint API `app/api/watchplay/route.ts`**:
   - Endpoint GET `/api/watchplay?id={id}&type=movie` para permitir resolución directa y redirección.
   - Integra almacenamiento automático en `stream-cache` de Supabase.
3. **Integración en `/api/resolve/route.ts`**:
   - Detección de proveedor `watchplay` (o URL `watchplay.shop`).
   - Consulta inmediata de la caché de BD (`stream_cache`). Si existe, asigna `type: "hls"` directamente al servidor S18.
   - En caso de no existir en caché, ejecuta la extracción ligera con timeout de 1.5s o entrega la fuente base para resolución client-side.
4. **Integración en `app/watch/page.tsx`**:
   - Extracción client-side en segundo plano cuando se detecta `watchplay`.
   - Persistencia en BD mediante `POST /api/resolve/cache-stream`.
   - Actualización de la fuente en-sitio para reproducir de inmediato en `NativeSourcePlayer`.
5. **Configuración del Proveedor S18 en Base de Datos**:
   - `supabase/migration_add_watchplay_provider.sql` con `id='watchplay'`, `name='WatchPlay'`, `ord=18`, `lang='pt'`.
   - Inclusión en `supabase/seed.sql`.

## 3. Criterios de Aceptación
- `fetchWatchPlayStream` extrae exitosamente streams HLS válidos para películas de TMDB e IMDb.
- El stream extraído tiene CORS abierto y es reproducible en `NativeSourcePlayer`.
- `/api/resolve` asocia el stream HLS a S18 y utiliza la caché de base de datos.
- Suite de pruebas automatizada `scripts/test-watchplay-extractor.mjs` pasa al 100%.
- `npm run build` compila sin errores.
