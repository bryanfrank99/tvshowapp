# Spec 088: Proveedor PlayerFlix con Extractor Nativo HLS Multi-Opción

## Contexto
El usuario requiere incorporar `playerflix.ink` como proveedor dinámico de reproducción en TVShow (tanto para películas como series), y lograr que la mayor cantidad posible de opciones devueltas por su API interna (`/inc/Ajax.php`) se resuelvan y reproduzcan como streams nativos HLS (`.m3u8`) directos para disfrutar de reproducción limpia, sin publicidad invasiva y 100% compatible con mando a distancia (D-Pad) en Android TV y escritorio.

La API de PlayerFlix requiere de forma obligatoria el encabezado HTTP `X-Requested-With: XMLHttpRequest` y devuelve un listado de opciones de streaming (`watchplay.shop`, `embedplayer2.xyz`, `embedplayabyss.top`, `superflixapi.quest`). Entre estas opciones, WatchPlay y EmbedPlayer albergan streams directos HLS fMP4/M3U8 que pueden ser extraídos y servidos nativamente en el reproductor.

## Objetivos
- [ ] Implementar el cliente/extractor de PlayerFlix en `lib/playerflix.ts` capaz de consultar `https://playerflix.ink/inc/Ajax.php` para películas y series.
- [ ] Extraer streams HLS directos fMP4/M3U8 de las opciones devueltas (especialmente WatchPlay y EmbedPlayer).
- [ ] Exponer endpoint API `/api/playerflix` con soporte de caché en Supabase (`stream_cache`) y redirección rápida.
- [ ] Integrar el proveedor en `/api/resolve/route.ts` y en `app/watch/page.tsx` para generar fuentes de reproducción `Source` nativas tipo `"hls"` con fallback a iframe si una opción lo requiere.
- [ ] Registrar la migración SQL para el alta del proveedor en Supabase (`supabase/migration_add_playerflix_provider.sql`).
- [ ] Validar con suite de pruebas automatizada `scripts/test-playerflix-extractor.mjs` y compilación verde `npm run build`.

## No objetivos
- No alojar archivos de video ni omitir la validación de derechos DMCA.
- No alterar proveedores existentes como Cinecalidad o NasriPlay.

## Criterios de aceptación
- [ ] `fetchPlayerFlixStreams({ id, type: "movie" })` extrae exitosamente streams HLS válidos para películas de TMDB (ej. `969681`, `157336`).
- [ ] `fetchPlayerFlixStreams({ id, type: "tv", season: 1, episode: 1 })` extrae exitosamente streams HLS válidos para series de TMDB (ej. `1399`).
- [ ] El endpoint `GET /api/playerflix?id=...&type=...` responde en JSON con los streams extraídos y almacena en `stream_cache`.
- [ ] `/api/resolve` detecta el proveedor PlayerFlix e inyecta fuentes `Source` con tipo `hls` priorizadas según el idioma (`pt`, `en`, `multi`).
- [ ] `npm run build` compila con éxito (0 errores de TypeScript).

## Restricciones
- Constitución aplicable: 1 (ES/EN/PT en UI), 2 (sin secretos en repo), 3 (build verde), 4 (soporte TMDB/free), 5 (proveedor configurable), 6 (navegable con control remoto), 8 (sin hosting propio).
- Peticiones a `playerflix.ink/inc/Ajax.php` deben incluir obligatoriamente `X-Requested-With: XMLHttpRequest` y `User-Agent`.
