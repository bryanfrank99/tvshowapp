# Especificación 095: Multi-Mirror y Failover de Servidores en S17 (NasriPlay)

## 1. Contexto y Objetivos
El servidor **S17 (NasriPlay - Audio Latino)** tiene la infraestructura técnica en `nsrplay.space` para proveer múltiples espejos (mirrors) de reproducción simultáneos tanto en formato **HLS nativo** (para auto-failover sin interrupciones con Hls.js en Android TV / Web) como en formato **iframe interactivo** con botones de selección de mirrors (`embedOptions` con Vimeus, Uqload, Streamwish, Voe).

Sin embargo:
1. En la base de datos Supabase, los campos `movie_tpl` y `tv_tpl` apuntaban a la API interna de JSON en lugar de la URL del reproductor embed iframe.
2. En `lib/nasriplay.ts`, una condición de parada prematura (`if (candidateUrls.length === 0)`) abortaba la búsqueda de streams HLS alternativos en cuanto encontraba el primer stream, dejando el arreglo `backupHlsUrls` vacío (`[]`) e impidiendo el auto-failover.
3. En `lib/nasriplay.ts`, las opciones de iframe (`embedOptions`) asignaban la URL interna de proxy `.m3u8` en lugar de resolver la URL de iframe web real (`/api/v1/embed/server-url?token=...`), lo que provocaba que los mirrors alternativos de iframe intentaran cargar un archivo de manifiesto HLS en vez del reproductor web del host.

## 2. Requisitos y Criterios de Aceptación
1. **Base de Datos Supabase (`providers`):**
   - Actualizar `movie_tpl` a `'https://nsrplay.space/embed/movie/{id}'`.
   - Actualizar `tv_tpl` a `'https://nsrplay.space/embed/tv/{id}/{s}/{e}'`.
   - Actualizar `name` a `'S17 (NasriPlay)'` para uniformidad con `S19 (Cinecalidad)`.
   - Mantener consistencia en `supabase/seed.sql`.
2. **Extractor de Streams HLS Directos (`lib/nasriplay.ts`):**
   - Extraer de forma concurrente todos los streams HLS disponibles:
     - `srv.playUrl` (stream proxy oficial de NasriPlay con encabezados CORS `*`).
     - `srv.directUrl` (cuando esté presente y responda con éxito).
     - Resoluciones directas de tokens elegibles (`/api/v1/embed/resolve`).
   - Validar concurrente y rápidamente la vivacidad del stream con `isLivePlayableStream`.
   - Población de `hlsUrl` (stream principal) y `backupHlsUrls` (espejos alternativos para auto-failover transparente).
3. **Extractor de Mirrors Iframe (`lib/nasriplay.ts`):**
   - Resolver las URLs reales de los hosts de streaming mediante `/api/v1/embed/server-url?token=...` en paralelo.
   - Construir la lista unificada `embedOptions` con nombres legibles (`Vimeus`, `Uqload`, `Streamwish`, `Voe`, etc.).
4. **Verificación y Calidad:**
   - Script de prueba integral (`scripts/test-s17-multi-mirror.mjs`) que valide películas y series.
   - `npm run build` exitoso con código 0 y sin errores.
