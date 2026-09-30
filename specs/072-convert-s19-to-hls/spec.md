# Spec 072: Conversión del Servidor S19 (Cinecalidad Latino) a HLS Nativo

## 1. Contexto y Problema
El servidor **S19 (Cinecalidad - Latino)** entrega contenido doblado al español latino de alta calidad para películas y series. Sin embargo, actualmente se resuelve como servidor iframe (`type: "iframe"`). Esto ocasiona:
- Falta de compatibilidad nativa con mandos a distancia de Android TV / WebOS / Tizen.
- Imposibilidad de unificarse en el **Pool HLS Español / Latino** con auto-failover transparente.
- Publicidad y tiempos de carga dependientes de iframes externos.

## 2. Solución Arquitectónica
Convertir S19 (Cinecalidad) en un proveedor de stream directo HLS (`type: "hls"`):

1. **Extractor Directo HLS (`lib/cinecalidad.ts`):**
   - Función `fetchCinecalidadStream`:
     - Consulta la API de playback de Cinecalidad (`https://tmdb.cinecalidad.am/v1/playback/...`).
     - Detecta el reproductor preferido (`vimeos.net`).
     - Desempaqueta el script JS comprimido y extrae la URL `.m3u8` maestra con audio nativo en español latino y pistas VTT.
     - Retorna `{ success: true, hlsUrl, subtitles, lang: "es" }`.

2. **Caché en Base de Datos Supabase (`lib/stream-cache.ts`):**
   - Utilizar `getCachedStream` y `setCachedStream` con TTL de 12 horas (tiempo de vida del token del stream de Vimeos).
   - Respuestas instantáneas en <20ms para streams ya resueltos.

3. **Integración en el Resolutor (`app/api/resolve/route.ts`):**
   - Al procesar el proveedor `cinecalidad` (S19), consultar la caché de streams M3U8 o extraer el stream fresco.
   - Entregar la fuente con `type: "hls"`, `lang: "es"`, `languages: ["es", "lat"]`.
   - Si no se encuentra stream directo o falla, mantener fallback transparente al iframe.
   - El pool HLS consolidará S19 en el grupo de audio en español (`Pool HLS Español / Latino`) con auto-failover.

4. **Base de Datos y Configuración (`providers` y `seed.sql`):**
   - Activar `hls_enabled: true` en el registro `cinecalidad` de la tabla `providers`.
   - Actualizar `supabase/seed.sql`.

5. **Endpoint API Cinecalidad (`app/api/cinecalidad/route.ts`):**
   - Permitir consultar el stream HLS directo o redirigir con 307 al archivo `.m3u8`.
