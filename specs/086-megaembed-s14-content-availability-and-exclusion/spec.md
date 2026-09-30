# Spec 086: Detección y Verificación de Disponibilidad Real de Contenido en MegaEmbed (S14) y Exclusión de Servidores Sin Contenido

## Contexto y Motivación
El usuario reporta la siguiente incidencia:
> "HLS - S14 se esta mostrando pero no tiene el contenido disponible, verifica eso, usa SDD"

Al investigar la causa raíz del problema en la infraestructura y lógica del resolver y reproductor:
1. **Falsos Positivos de Streams Muertos / Sin Contenido en MegaEmbed:**
   - Muchas páginas embebidas de MegaEmbed (`mgeb.top` / `megaembed.com`) incluyen enlaces `.m3u8` servidos a través de un proxy CDN de terceros (`cdn*.playercdn.xyz/includes/hls.php?url=...`).
   - Estos enlaces devuelven un error HTTP 403 Forbidden con el cuerpo JSON:
     `{"error":"Assinatura inválida ou corrompida."}` ("Firma inválida o corrupta").
   - El extractor `lib/megaembed.ts` aceptaba ciegamente cualquier coincidencia con `.m3u8` sin verificar si el stream realmente existía o si era un enlace caducado/inútil de CDN.
   - En consecuencia, títulos como *Deadpool & Wolverine* (`533535`), *Alien Romulus* (`945961`), etc., extraían este enlace roto, `app/api/resolve/route.ts` creaba la fuente `HLS - S14`, y al estar en idioma portugués (`lang: pt`), se asignaba como servidor prioritario en la posición 0. Al intentar reproducir, Hls.js fallaba por manifiesto corrupto/error 403 y el usuario se encontraba con un servidor que no tiene el contenido disponible.
2. **Fallback Indebido a Iframes Inexistentes / 404 en el Resolver:**
   - Cuando un título no está disponible en MegaEmbed (o fallaba la extracción de stream directo), `app/api/resolve/route.ts` no descartaba el servidor. En su lugar, caía en `providersToSources([prov])`, emitiendo una fuente iframe `S14` apuntando a `https://mgeb.top/embed/{id}`.
   - Dado que MegaEmbed devuelve HTTP 404 "Página não encontrada" para títulos ausentes, el servidor `S14` seguía apareciendo en el selector aunque no tuviera contenido.
3. **Falta de Soporte de Series o Catálogos Falsos:**
   - En Supabase, `megaembed` tenía `tv_ok = true`, `movie_list_url = 'https://mgeb.top/api/movie'` y `tv_list_url = 'https://mgeb.top/api/series'`.
   - Dichos endpoints devuelven HTTP 404. El verificador `isRedeflixAvailable` agotaba su timeout de 1500ms y asumía disponibilidad por fallback `true`.
   - Adicionalmente, `megaembed` solo tiene streams válidos en endpoints directos o en su caché interna `cache/hls/{hash}.m3u8`, que funcionan cuando devuelven HTTP 200 y encabezados/cuerpo válidos `#EXTM3U`.
4. **Retención de Fuentes Fallidas en el Cliente (`app/watch/page.tsx`):**
   - Si el cliente intentaba extraer el stream de MegaEmbed y fallaba (`streamResult?.hlsUrl` nulo o inválido), la fuente original `S14` quedaba en la lista de `sources` en vez de ser purgada.

## Objetivos
1. **Verificación Rápida y Robusta de Streams en `lib/megaembed.ts`:**
   - Toda URL de stream HLS o MP4 candidata extraída de MegaEmbed debe verificarse rápidamente (con timeout de 1800ms) mediante un HEAD o GET parcial de los primeros bytes.
   - Si la respuesta es HTTP 403/404/5xx, o el cuerpo contiene errores explícitos como `"Assinatura inválida"`, o no contiene la cabecera `#EXTM3U` ni tipo MIME de stream de video, se descarta inmediatamente como candidata.
   - Las URLs con rutas relativas como `https://mgeb.top/../cache/hls/...` deben normalizarse a `https://mgeb.top/cache/hls/...`.
   - Solo si al menos un stream es válido y reproducible, `fetchMegaEmbedStream` retorna `success: true` con el `hlsUrl` verificado y sus `backupHlsUrls` válidos. Si ninguno es válido, retorna `success: false`.
2. **Exclusión Estricta en `app/api/resolve/route.ts`:**
   - Si MegaEmbed no tiene un stream directo verificado disponible (`!directHlsUrl`), el resolver **NO** debe emitir una fuente iframe de fallback. Retorna `provSources` vacío (`[]`), excluyendo por completo a `HLS - S14` y `S14` de la lista de servidores para ese contenido.
3. **Limpieza y Purgado en `app/watch/page.tsx`:**
   - Si por alguna razón `megaembed` aparece en `rawList` y la extracción asíncrona client-side determina que no hay stream válido (`!streamResult?.hlsUrl`), se purga completamente a `megaembed` de la lista de fuentes `sources`, evitando que persista un servidor iframe roto o una tarjeta muerta.
4. **Configuración de Base de Datos y Supabase:**
   - Limpiar `movie_list_url` y `tv_list_url` muertos en Supabase para el proveedor `megaembed` para que no provoquen timeouts innecesarios en `isRedeflixAvailable`.
   - Actualizar `supabase/seed.sql` con los ajustes correspondientes.

## Criterios de Aceptación
1. **Títulos sin contenido o con firmas corruptas (ej. Inside Out 2 `1022789`, Fight Club `550`, Deadpool `533535`):**
   - Ni `HLS - S14` ni `S14` deben figurar en la respuesta de `/api/resolve` ni en la lista de servidores del reproductor.
2. **Títulos con contenido real verificado (ej. Dune 2 si tuviera stream válido o Breaking Bad con `cache/hls` verificado):**
   - Si el stream verificado devuelve HTTP 200 con `#EXTM3U`, `HLS - S14` se emite normalmente con la URL funcional y normalizada.
3. **Cero regresiones en los demás servidores HLS (S18 WatchPlay, S17 NasriPlay, S19 Cinecalidad):**
   - Permanecen completamente operativos con su resolución independiente y fallback natural.
4. **Compilación y Tests:**
   - `npx tsc --noEmit` pasa sin errores.
   - Script de prueba de la especificación 086 verifica que los títulos sin contenido no muestran S14.
