# Plan 067: Optimización de Rendimiento, Caché de Streams en BD y Limpieza de UI

## 1. Arquitectura de Cambios

### A. Persistencia de Streams M3U8 en BD (`lib/stream-cache.ts` y Migración SQL)
1. Crear `supabase/migration_stream_cache.sql`:
   - Tabla `stream_cache` (`id`, `provider_id`, `media_type`, `target_id`, `season`, `episode`, `hls_url`, `backup_urls`, `extracted_at`, `expires_at`).
2. Crear módulo `lib/stream-cache.ts`:
   - Función `getCachedStream(providerId, type, targetId, season, episode)`:
     - Intenta consultar la tabla `stream_cache`.
     - Si la tabla no existe, consulta la tabla `config` con clave `stream:${cacheKey}`.
     - Valida `expires_at` (12 horas por defecto).
   - Función `setCachedStream(params)`:
     - Guarda el stream en `stream_cache` (o en `config` como fallback).
3. Crear endpoint `app/api/resolve/cache-stream/route.ts` (o extender `app/api/megaembed/route.ts`):
   - Permite que el cliente guarde streams extraídos directamente en la base de datos de forma segura.

### B. Optimización de `/api/resolve/route.ts`
1. Consultar la caché de base de datos antes de procesar proveedores que soportan extracción de stream.
2. Si el stream está en BD, asociarlo directamente a la fuente con latencia cero.
3. Paralelizar comprobaciones de disponibilidad de catálogo (`isRedeflixAvailable`, `checkCatalogAvailability`) usando `Promise.allSettled` con timeout estricto de 1.5s por proveedor para evitar congelamiento.
4. Si un stream aún no está en caché, no bloquear la respuesta de `/api/resolve` con esperas síncronas de scraping de 15 segundos; retornar el catálogo de inmediato y permitir que el cliente o el reproductor resuelva en segundo plano.

### C. Ocultamiento del Servidor HLS en la Lista de Servidores
1. En `components/player/SourceSelectorGrid.tsx`:
   - Filtrar `sources` en la cuadrícula para omitir fuentes con `type === "hls"` o `id.endsWith("-native")` que sean duplicadas de un proveedor principal.
   - En la cabecera y selección, cuando se elija el servidor (ej. S14 MegaEmbed), mostrar el nombre canónico `S14 MegaEmbed` y reproducir nativamente.
2. En `app/watch/page.tsx`:
   - Al asociar el stream nativo HLS al servidor correspondiente, mantener un único ID representativo o vincularlo de forma transparente para que la lista solo muestre los servidores ordenados del 1 al 15 sin duplicados "HLS".

### D. Limpieza de UI en `app/watch/page.tsx`
1. Retirar el contenedor de botones rápidos debajo del video:
   - Eliminar `<button id="btn-fullscreen">` ("Tela cheia").
   - Eliminar `<button id="btn-cycle-server">` ("Trocar servidor").
2. Preservar intacta la navegación de episodios para series (`btn-prev-ep`, `btn-next-ep`, `btn-all-ep`).

### E. Perfeccionamiento del Icono Central de Pausa (`NativeSourcePlayer.tsx`)
1. En `togglePlay()`:
   - Eliminar las llamadas `triggerFeedback("⏸", "Pausa")` y `triggerFeedback("▶", "Reproducir")`.
   - Mantener exclusivamente `setCenterPulse("play")` y `setCenterPulse("pause")`.
2. Estilizar `centerPulse`:
   - Asegurar centrado perfecto, efecto glassmorphism oscuro y pulso visual limpio que desaparece tras 600 ms, idéntico al comportamiento de las aplicaciones de Smart TV modernas (Netflix/YouTube TV).

### F. Verificación y Pruebas
1. Crear suite de pruebas `scripts/test-stream-cache-and-ui-cleanup.mjs` que verifique:
   - Ocultamiento de tarjetas HLS en la lista de servidores.
   - Ausencia de botones externos eliminados en `watch/page.tsx`.
   - Inexistencia de llamadas a `triggerFeedback` con "Pausa" / "Reproducir" en `togglePlay`.
   - Funcionamiento de lectura/escritura del módulo `stream-cache`.
2. Ejecutar `npm run build` para asegurar 0 errores de compilación.
