# Spec 078: Corrección de Duplicidad HLS en Portugués, Identidad de Servidores y Consolidación de Streams

## 1. Problema Identificado
En la vista del reproductor (`/watch`), aparecían dos servidores con el título "HLS" en portugués (uno simple y otro multi-stream):
1. **Pérdida de identidad de servidor en `SourceSelectorGrid.tsx`**: La condición `{x.type === "hls" ? "HLS" : x.providerName}` forzaba el nombre `"HLS"` y ocultaba el número `#ord` en cualquier servidor cuyo tipo de stream fuera HLS, incluso si era un servidor individual (como S18 WatchPlay o S20 MegaEmbedAPI).
2. **Mutación client-side en `app/watch/page.tsx`**: Las extracciones secundarias en el cliente convertían tarjetas individuales de tipo iframe a `type: "hls"`, generando una tarjeta separada titulada `"HLS"` en lugar de incorporar el stream al Pool HLS existente del mismo idioma.
3. **Deduplicación en el Resolver**: Proveedores como `megaembed` (S14) y `MegaEmbedAPI` (S20) extraen del mismo endpoint base (`mgeb.top`), generando URLs idénticas que deben deduplicarse limpiamente en el pool HLS.

## 2. Solución y Reglas

### A. Identidad de Servidor en `SourceSelectorGrid.tsx`
- Solo las fuentes unificadas del pool (`x.ord === 0 || x.providerName === "HLS"`) se titulan `"HLS"` y muestran la insignia `MULTI-STREAM` cuando tienen backups.
- Los servidores individuales (con `x.ord > 0`) muestran su número `#{x.ord}` y su nombre asignado (`x.providerName`, ej. `S14`, `S18`, `S20`), manteniendo su tipo de stream indicado en la insignia verde `[HLS]` a la derecha.

### B. Consolidación Client-Side en `app/watch/page.tsx`
- Si la extracción en cliente resuelve un stream HLS para un proveedor (ej. MegaEmbed o WatchPlay) y ya existe un Pool HLS activo del mismo idioma de audio (`pt`):
  - El stream se añade a los `backupUrls` y al `urlServerMap` del Pool HLS para enriquecer el failover automático.
  - La tarjeta individual conserva su identidad y enlace sin duplicar una tarjeta `"HLS"` genérica.

### C. Deduplicación y Consolidación en `app/api/resolve/route.ts`
- Durante la consolidación de `hlsByLang`, asegurar que todos los servidores compatibles con portugués (`megaembed`, `EmbedMovies-V2`, `MegaEmbedAPI`) se integren en un único pool `HLS (PT)` sin dejar fuentes HLS huérfanas en `sources`.
- Deduplicar streams con URLs equivalentes para evitar backups redundantes.
