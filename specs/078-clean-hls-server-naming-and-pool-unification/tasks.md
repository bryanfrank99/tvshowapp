# Tasks: Spec 078 - Corrección de Duplicidad HLS en Portugués, Identidad de Servidores y Consolidación de Streams

- [x] **Tarea 1: Identidad visual de servidores en `components/player/SourceSelectorGrid.tsx`**
  - [x] Ajustar la condición del título: solo mostrar `"HLS"` si `x.ord === 0 || x.providerName === "HLS"`. De lo contrario, mostrar `x.providerName`.
  - [x] Mostrar el número `#{x.ord}` para todos los servidores individuales (`x.ord > 0`), independientemente de si su stream es HLS o iframe.

- [x] **Tarea 2: Consolidación de streams en `app/watch/page.tsx`**
  - [x] Al completar la extracción en segundo plano de un stream HLS (MegaEmbed, WatchPlay, NasriPlay), si ya existe un pool HLS del mismo idioma en `sources`, integrar la URL en sus `backupUrls` y `urlServerMap`.
  - [x] Evitar duplicar tarjetas con título genérico `"HLS"`.

- [x] **Tarea 3: Deduplicación y robustez en `app/api/resolve/route.ts`**
  - [x] Asegurar que las URLs idénticas de `mgeb.top` (entre S14 y S20) se dedupliquen al construir `backupUrls` y `urlServerMap`.
  - [x] Verificar que ninguna fuente individual de tipo `hls` quede fuera del pool consolidado.

- [x] **Tarea 4: Verificación y pruebas**
  - [x] Ejecutar prueba de resolución comprobando que para `pt` se genera 1 sola tarjeta titulada `HLS` con badge `MULTI-STREAM`.
  - [x] Ejecutar `npx tsc --noEmit` para garantizar tipado estricto.
  - [x] Realizar commit y push.
