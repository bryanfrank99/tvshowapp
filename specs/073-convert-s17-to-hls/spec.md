# Spec 073: Conversión del Servidor S17 (NasriPlay) a HLS Nativo e Integración en Pool Español

## 1. Contexto y Problema
El servidor **S17 (NasriPlay)** entrega contenido en español latino tanto para películas como para series de TV mediante `https://nsrplay.space/embed/...`. Sin embargo, hasta ahora se manejaba únicamente como un reproductor `<iframe>` de terceros:
- Conlleva popups y anuncios externos molestos para el usuario.
- No es compatible con el mando a distancia en Smart TV / Android TV / WebOS / Tizen.
- No formaba parte del **Pool HLS Español / Latino**, perdiendo la oportunidad de proveer auto-failover con S19 (Cinecalidad).

## 2. Descubrimiento de la API de NSR Play
La plataforma `nsrplay.space` expone un backend JSON (`/api/v1/embed/sources/...` y `/api/v1/embed/resolve`) que provee streams directos `.m3u8` multi-calidad con audio Latino (Vimeos y Uqload) usando tokens de página (`PAGE_TOKEN`) generados dinámicamente en el embed HTML.
Las URLs maestras `.m3u8` extraídas responden con `HTTP 200` y `Access-Control-Allow-Origin: *`, permitiendo reproducción nativa directa en el cliente.

## 3. Solución Arquitectónica

1. **Módulo Extractor HLS (`lib/nasriplay.ts`):**
   - Función `fetchNasriPlayStream({ id, type, season, episode, timeoutMs })`:
     - Obtiene `PAGE_TOKEN` desde la página de embed `https://nsrplay.space/embed/{movie|tv}/{id}...`.
     - Consulta `https://nsrplay.space/api/v1/embed/sources/...`.
     - Extrae el stream principal (`directUrl`, comúnmente Vimeos) y resuelve fuentes secundarias elegibles (como Uqload) para generar `backupHlsUrls`.
     - Retorna `{ success: true, hlsUrl, backupHlsUrls, lang: "es", meta }`.

2. **Caché en Base de Datos Supabase (`lib/stream-cache.ts`):**
   - Persistir streams resueltos de `nasriplay` con TTL de 12 horas.
   - Peticiones repetidas responden en <20ms desde memoria o Supabase DB.

3. **Resolutor Central (`app/api/resolve/route.ts`):**
   - Si el proveedor es `nasriplay` (S17), intentar obtener stream HLS de caché o extraer en tiempo real.
   - Entregar fuente como `type: "hls"`, `languages: ["es", "lat"]`, `priority: 120`.
   - Si no se encuentra stream directo para algún contenido exótico, fallback a iframe clásico.
   - La consolidación HLS agrupa S17 y S19 en el **Pool HLS Español / Latino** con auto-failover transparente.

4. **Configuración y Base de Datos:**
   - Registrar `nasriplay: { enabled: true, extractor: "direct" }` en `config.provider_hls_config`.
   - Actualizar `app/api/admin/providers/route.ts` y `supabase/seed.sql`.

5. **Pruebas y Validación:**
   - Pruebas automatizadas en `scripts/test-nasriplay-hls.mjs`.
   - Verificación estricta de TypeScript con `npx tsc --noEmit`.
