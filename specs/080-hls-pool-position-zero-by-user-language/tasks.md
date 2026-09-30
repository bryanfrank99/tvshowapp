# Tasks: Spec 080 - Prioridad Absoluta en Posición 0 para Pool HLS respetando Idioma del Usuario

- [x] **Tarea 1: Implementar y refactorizar en `lib/sources.ts`**
  - [x] Crear la función `isHlsPoolSource(s: Source): boolean`.
  - [x] Refactorizar `sortSourcesByPriority` para que dentro del grupo compatible con el idioma del usuario, las fuentes de tipo Pool HLS se ubiquen obligatoriamente en la posición 0.
  - [x] Corregir la regla de desempate por `ord` para que `ord === 0` se evalúe correctamente como 0 en lugar de `999`.

- [x] **Tarea 2: Sincronización Dinámica en `app/watch/page.tsx`**
  - [x] En la extracción client-side de MegaEmbed, WatchPlay y NasriPlay, tras crear o actualizar la pool HLS, aplicar `sortSourcesByPriority` sobre la lista de fuentes.
  - [x] Sincronizar `recommendedSourceId` al ID de la pool HLS en la posición 0.

- [x] **Tarea 3: Verificación mediante Pruebas Automatizadas**
  - [x] Caso 1: Usuario PT con pool `HLS (PT)` presente -> `HLS (PT)` debe quedar en `sources[0]`.
  - [x] Caso 2: Usuario PT con pool `HLS (ES)` presente pero sin pool `HLS (PT)` -> `S11` y `S12` (en portugués) deben quedar de primeros, y `HLS (ES)` al final.
  - [x] Caso 3: Usuario ES con pool `HLS (ES)` presente -> `HLS (ES)` debe quedar en `sources[0]`.
  - [x] Caso 4: Verificación de tipos con `npx tsc --noEmit`.

- [x] **Tarea 4: Documentación y Commit**
  - [x] Completar checklist en `tasks.md`.
  - [x] Realizar commit y push a `origin/main`.
