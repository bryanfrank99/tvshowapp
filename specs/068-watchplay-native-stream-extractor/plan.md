# Plan 068: Extractor Nativo HLS para WatchPlay (S18)

## 1. Arquitectura de Cambios

### A. Módulo Extractor `lib/watchplay.ts`
1. Parámetros de extracción: `id` (TMDB o IMDb), `type` (movie/tv), `season`, `episode`.
2. URL base: `https://v2.watchplay.shop/movie/{id}`.
3. Fetch con User-Agent moderno y Referer.
4. Extracción de stream mediante regex de `createMyPlayer({ ... url: "..." ... })`.
5. Retorno estructurado con `hlsUrl`, `lang: "pt"`, `success: true`.

### B. Endpoint API `app/api/watchplay/route.ts`
1. Acepta `GET ?id={id}&type={type}&redirect={1|0}`.
2. Consulta previa a `getCachedStream`.
3. Si no existe, invoca `fetchWatchPlayStream`.
4. Al extraer exitosamente, guarda en caché BD mediante `setCachedStream`.
5. Si `redirect=1`, redirige HTTP 307 al archivo `.m3u8`.

### C. Integración con `/api/resolve/route.ts`
1. Reconocer proveedor `prov.id === "watchplay"` o `prov.movie_tpl.includes("watchplay")`.
2. Consultar `getCachedStream({ providerId: "watchplay", type, targetId, ... })`.
3. Si está en BD, asignar `type: "hls"`, `url: cached.hlsUrl`, `ord: 18`.
4. Si no está en BD, intentar extracción rápida (timeout 1.5s). Si responde, cachear en BD y asignar `type: "hls"`.
5. En caso de timeout, devolver la fuente base para resolución client-side sin bloquear.

### D. Integración en `app/watch/page.tsx`
1. Al cargar fuentes, si `rawList` contiene `watchplay` y no es aún `type === "hls"`:
   - Invocar `fetchWatchPlayStream` en background.
   - Enviar a `POST /api/resolve/cache-stream`.
   - Actualizar el estado local `sources` en-sitio (`type: "hls"`, `url: hlsUrl`).

### E. Migración SQL y Seed
1. Crear `supabase/migration_add_watchplay_provider.sql`.
2. Actualizar `supabase/seed.sql` con el registro de S18 WatchPlay (`ord: 18`, `lang: "pt"`).

### F. Validación
1. Crear script `scripts/test-watchplay-extractor.mjs`.
2. Validar con películas reales (Fight Club 550, Interstellar 157336).
3. Compilar con `npm run build`.
