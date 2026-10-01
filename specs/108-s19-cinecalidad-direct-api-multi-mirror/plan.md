# Plan de Arquitectura e Implementación - Spec 108

## 1. Arquitectura del Motor de Extracción Declarativo para S19

### 1.1 Configuración JSON de la Pipeline (Preset `cinecalidad` y `vimeos_json`)
```json
{
  "version": 2,
  "mode": "pipeline",
  "preset": "cinecalidad",
  "steps": [
    {
      "id": "cinecalidad_api",
      "action": "http_request",
      "movie_url": "https://tmdb.cinecalidad.am/v1/playback/movie/{id}",
      "tv_url": "https://tmdb.cinecalidad.am/v1/playback/tvshow/{id}?season={s}&episode={e}",
      "method": "GET",
      "headers": {
        "Referer": "https://cinecalidad.am/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        "Accept": "application/json"
      },
      "response_type": "json",
      "timeout_ms": 10000
    },
    {
      "id": "cinecalidad_streams",
      "action": "cinecalidad_resolve_embeds",
      "input": "{{cinecalidad_api.embeds}}"
    }
  ],
  "output": {
    "hlsUrl": "{{cinecalidad_streams.hlsUrl}}",
    "backupHlsUrls": "{{cinecalidad_streams.backupHlsUrls}}",
    "subtitles": "{{cinecalidad_streams.subtitles}}",
    "embeds": "{{cinecalidad_streams.embeds}}"
  }
}
```

### 1.2 Acción `cinecalidad_resolve_embeds` en `lib/hls-engine.ts`
- Normalizar y mapear cada embed retornado por la API (`vimeos.net`, `goodstream.one`, etc.).
- Preservar todas las opciones en el array `embeds` estructurado.
- Si alguna opción es un `.m3u8` directo nativo, tomarlo; evitar el paso destructivo de desempaquetar Vimeos con enlaces temporales con hash de IP que fallan en el cliente.
- Emitir `embeds` completo para que `app/api/resolve/route.ts` construya la tarjeta multi-mirror idéntica a S20.

## 2. Modificaciones en Frontend y Backend

1. **`app/watch/page.tsx`**:
   - Eliminar llamadas client-side manuales a `/api/cinecalidad?stream=1`.
   - Permitir que el flujo nativo de `/api/resolve` maneje S19 como lo hace con S20, S14 y el resto de proveedores.

2. **`lib/cinecalidad.ts` y `app/api/cinecalidad/route.ts`**:
   - Reemplazar todas las ocurrencias de `https://tmdb.allcalidad.re/` por `https://tmdb.cinecalidad.am/`.

3. **`app/api/resolve/route.ts`**:
   - S19 continuará en modo `"both"` (o configurado por el usuario en panel admin), garantizando que las opciones de mirrors se presenten para selección en la interfaz del reproductor.

## 3. Sincronización en Base de Datos Supabase
- Actualizar `providers` (id `cinecalidad`):
  - `movie_tpl = https://tmdb.cinecalidad.am/v1/playback/movie/{id}`
  - `tv_tpl = https://tmdb.cinecalidad.am/v1/playback/tvshow/{id}?season={s}&episode={e}`
- Actualizar `config` (key `provider_extractor_configs`):
  - `cinecalidad` con la nueva definición de pipeline.
- Invalidar registros de caché en tabla `stream_cache` para `cinecalidad`.
- Actualizar `supabase/seed.sql`.
