# Spec 098: Unificación Total de Resolución de Proveedores y Reparación de S14 (MegaEmbed)

## 1. Contexto y Diagnóstico
En la versión actual, el sistema de resolución en `app/api/resolve/route.ts` posee bloques de código independientes y bifurcaciones `if (prov.id === ...)` para Cinecalidad (S19), PlayerFlix (S20), NasriPlay (S17), MegaEmbed (S14) y WatchPlay (S18). Esto genera inconsistencias, duplicidad de lógica y rompe la arquitectura del motor dinámico JSON declarativo (Spec 097).

Asimismo, **S14 (MegaEmbed)** fallaba al resolver cualquier contenido debido a:
1. Timeout agresivo de 4500ms en peticiones a `mgeb.top`, cuya negociación LiteSpeed/Cloudflare toma habitualmente entre 5 y 6 segundos.
2. Carrera paralela `Promise.any` contra `megaembed.com` (host inalcanzable), provocando `AggregateError: All promises were rejected`.
3. Verificación de stream con timeout de 2000ms que descartaba URLs válidas de CDNs autorizados (`solo-latino.com`, `playspelis.com`).

## 2. Objetivos
1. **Reparación definitiva de S14 (MegaEmbed):**
   - Implementar un paso de pipeline declarativo `megaembed_parse_sources` en `lib/hls-engine.ts`.
   - Configurar el pipeline JSON de MegaEmbed en 3 pasos: `http_request` (timeout 12s) -> `regex_extract` de `var sources = [...]` -> `megaembed_parse_sources` (normalización de URLs y ordenamiento de HLS primario y espejos).
   - Robustecer `lib/megaembed.ts` con timeouts adecuados y recuperación de fuentes.
2. **Unificación Total en `app/api/resolve/route.ts`:**
   - Eliminar todas las bifurcaciones específicas por proveedor (`if (prov.id === 'cinecalidad')`, `if (prov.id === 'playerflix')`, etc.).
   - Tratar a **todos los proveedores por igual** a través de un único ciclo de ejecución:
     - Consulta de caché (`getCachedStream`).
     - Extracción declarativa uniforme (`runHlsExtractor`).
     - Almacenamiento en caché (`setCachedStream`).
     - Emisión de fuente directa HLS (`type: 'hls'`) con máxima prioridad (120).
     - Emisión de tarjeta iframe unificada con `embedOptions` si existen mirrors de embed.
     - Fallback a iframe estándar solo si `allowEmbedFallback` está habilitado.
3. **Persistencia en Supabase:**
   - Actualizar `supabase/seed.sql` y sincronizar los registros de `providers` y `config`.
