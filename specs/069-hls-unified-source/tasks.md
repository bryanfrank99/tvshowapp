# Tasks: Spec 069 - Pool HLS Unificado, Corrección S18 y Resume Playback

- [x] **Tarea 1: Diagnóstico y Corrección de S18 (WatchPlay)**
  - [x] Identificar la expiración del token (`expires`) de 10-15 min.
  - [x] Priorizar Hls.js en `NativeSourcePlayer.tsx` para admitir fragmentos `.js`.
  - [x] Aumentar timeout en `app/api/resolve/route.ts` a 2800 ms.

- [x] **Tarea 2: Caché Inteligente y Auto-Purga en Base de Datos**
  - [x] Implementar TTL dinámico en `lib/stream-cache.ts` según el parámetro `expires`.
  - [x] Implementar auto-purga asíncrona de registros vencidos (`DELETE FROM stream_cache WHERE expires_at < NOW()`).

- [x] **Tarea 3: Pool HLS Unificado con Failover Transparente**
  - [x] Unificar fuentes HLS en `app/api/resolve/route.ts` inyectando `backupUrls`.
  - [x] Añadir badges `MULTI-STREAM` en `SourceSelectorGrid.tsx`.
  - [x] Añadir badge `POOL HLS NATIVO` en `app/admin/page.tsx`.

- [x] **Tarea 4: Persistencia de Posición en Local DB (Resume Playback)**
  - [x] Crear módulo `lib/playback-progress.ts` con claves deterministas.
  - [x] Conectar en `app/watch/page.tsx` y `PlayerContainer.tsx` mediante `playbackKey`.
  - [x] Implementar reanudación automática en `onLoadedMetadata` y guardado continuo en `NativeSourcePlayer.tsx`.
  - [x] Resetear progreso si se alcanza >= 92% de duración.

- [x] **Tarea 5: Verificación y Pruebas**
  - [x] Crear y ejecutar suite de pruebas automatizada `scripts/test-unified-hls-and-playback.mjs`.
  - [x] Validar tipado TypeScript con `npx tsc --noEmit`.
