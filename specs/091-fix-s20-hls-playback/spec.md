# Spec 091: Corregir Reproducción HLS de Servidores Restantes de S20 (PlayerFlix)

## Contexto y Causa Raíz
Tras la desactivación de WatchPlay en el servidor S20 (Spec 090), el usuario reportó que ninguno de los servidores de S20 que quedaron activos está cargando en HLS ("ninguno de los servidores de S20 que dejamos activos estan cargando en HLS, usa sdd y resuleve el problema").

### Análisis Forense del Problema
1. **Bloqueo HTTP 403 en Proxy para Segmentos HLS de VIP Player:**
   - La API de `embedplayer2.xyz` (`VIP Player`) devuelve una lista de reproducción maestra (`master.m3u8`) cuyas sub-listas de reproducción apuntan a múltiples servidores CDN dinámicos con dominios `.xyz` como `eloialu16.xyz`, `eloialu17.xyz`, `eloialu18.xyz`, etc., además de `plosia*.xyz`.
   - El endpoint `app/api/playerflix/proxy/route.ts` tenía una lista blanca restrictiva (`ALLOWED_HOST_PATTERNS`) que únicamente permitía `embedplayer*.xyz` y `plosia*.xyz`.
   - Al reproducir la mayoría de películas (como Avengers: Infinity War `299536`, Harry Potter `671`, Matrix `603`, etc.), `Hls.js` solicitaba los fragmentos de video `.js` / `.woff` / `.css` a través del proxy y recibía `403 Forbidden: Host no autorizado`, provocando un fallo de red fatal en el reproductor nativo.
2. **Falta de reescritura de etiquetas `#EXT-X-KEY` / `#EXT-X-MAP` con `URI="..."` en el Proxy:**
   - El proxy omitía cualquier línea que comenzara con `#`, por lo que si una lista de reproducción incluía llaves de cifrado o mapas de inicialización relativos o con protección de `Referer`, fallaban.
3. **Pérdida de Opciones Alternativas en `app/watch/page.tsx` (`mergeExtractedStreams`):**
   - En `app/watch/page.tsx`, `mergeExtractedStreams` filtraba las fuentes con la condición `!(s.providerId === it.providerId && s.type !== "hls" && !s.id.includes("iframe"))`.
   - Dado que los servidores alternativos generados en `resolve/route.ts` tenían IDs como `playerflix-alt-1`, `playerflix-alt-2`, etc. (sin la subcadena `iframe`), la función eliminaba por accidente todas las fuentes alternativas de S20 (Embed Play, VIP Player Web, Premium).
4. **Manejo de Títulos sin VIP Player:**
   - Para títulos donde PlayerFlix solo ofrece Embed Play y Premium (reproductores web protegidos por Cloudflare Challenge/Turnstile), no existe stream HLS directo. En esos casos, S20 debe presentar limpiamente los servidores disponibles como iframe sin intentar forzar una URL HLS inexistente.

## Objetivos
- [ ] Ampliar la validación de dominios autorizados en `app/api/playerflix/proxy/route.ts` para permitir cualquier CDN legítimo de PlayerFlix/EmbedPlayer (`*.xyz`, `playerflix.ink`, etc.) bloqueando IPs privadas/locales.
- [ ] Mejorar la reescritura de listas de reproducción M3U8 en el proxy para dar soporte a tags con atributos `URI="..."` (claves de cifrado `#EXT-X-KEY`, `#EXT-X-MAP`).
- [ ] Soportar cabeceras de rango (`Range`) y respuestas de contenido parcial (`206 Partial Content`) en el proxy.
- [ ] Corregir la asignación de IDs y la preservación de fuentes alternativas en `app/api/resolve/route.ts` y `app/watch/page.tsx` (`mergeExtractedStreams`).
- [ ] Identificar claramente las opciones de S20 en la UI: `HLS - S20 (VIP Player)` para streams nativos, y `S20 (Embed Play - pt/en)` o `S20 (VIP Player - Web)` para iframes.
- [ ] Actualizar la suite de pruebas `scripts/test-playerflix-extractor.mjs` para verificar la descarga completa de fragmentos HLS vía proxy con dominios como `eloialu*.xyz`.
- [ ] Verificar `npm run build` sin errores.

## No objetivos
- No reactivar WatchPlay en S20 (permanece en S18).
- No realizar scraping de flujos protegidos con Cloudflare Challenge de `abysscdn.com` (se sirven en iframe sandbox).

## Criterios de aceptación
- [ ] Los fragmentos de video provenientes de servidores `eloialu*.xyz` u otros dominios `.xyz` se sirven correctamente con HTTP 200/206 y CORS abierto a través de `/api/playerflix/proxy`.
- [ ] `Hls.js` en `NativeSourcePlayer` puede reproducir sin errores de host ni fallas de red el stream `HLS - S20 (VIP Player)`.
- [ ] Las opciones secundarias de S20 (Embed Play, VIP Player Web, Premium) permanecen accesibles en el selector de servidores sin ser eliminadas por `mergeExtractedStreams`.
- [ ] Todas las pruebas de `scripts/test-playerflix-extractor.mjs` pasan exitosamente.
- [ ] `npm run build` compila con 0 errores.
