# Tasks: Spec 082 - Exclusión de Servidores Beta de la Pool HLS Unificada

- [x] **Tarea 1: Actualizar lógica en `lib/sources.ts`**
  - [x] Garantizar que `isHlsPoolSource` devuelva `false` si `s.isBeta` es `true`.

- [x] **Tarea 2: Filtrado en `app/api/resolve/route.ts`**
  - [x] En la consolidación HLS (líneas ~616-686), separar las fuentes HLS en `hlsPoolSources` (`type === "hls" && !s.isBeta`) y `standaloneSources` (`type !== "hls" || s.isBeta`).
  - [x] Consolidar únicamente las fuentes estables en `consolidatedHls`.
  - [x] Recombinar `[...consolidatedHls, ...standaloneSources]` asegurando que los servidores HLS beta se preserven como tarjetas individuales.

- [x] **Tarea 3: Filtrado en `app/watch/page.tsx`**
  - [x] En `mergeExtractedStreams`, verificar `item.isBeta`. Si es `true`, no fusionarlo en la pool HLS existente ni crear pool unificada, sino mantenerlo como fuente individual HLS beta.

- [x] **Tarea 4: Verificación y Pruebas Automatizadas**
  - [x] Crear script de prueba automatizado que verifique que un servidor HLS beta permanece fuera de la pool HLS y seleccionable de forma independiente.
  - [x] Verificar con `npx tsc --noEmit`.

- [x] **Tarea 5: Documentación y Commit**
  - [x] Actualizar `tasks.md`.
  - [x] Realizar commit y push a `origin/main`.
