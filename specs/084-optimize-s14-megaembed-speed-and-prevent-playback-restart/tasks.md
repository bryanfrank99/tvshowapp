# Tasks: Spec 084 - Optimización de S14 (MegaEmbed), Carga Prioritaria HLS y Prevención de Reinicio

- [x] **Tarea 1: Optimización de velocidad en MegaEmbed (`lib/megaembed.ts`)**
  - [x] Implementar carrera concurrente paralela entre `mgeb.top` y `megaembed.com` usando `Promise.any` y timeout de 4.5s.
  - [x] Eliminar validación de red secuencial/bloqueante de manifiestos HLS que agregaba 3.5s de latencia innecesaria.
  - [x] Asignar directamente la primera opción HLS y el resto a `backupHlsUrls`.

- [x] **Tarea 2: Optimización del Resolver del Servidor (`app/api/resolve/route.ts`)**
  - [x] Ajustar el timeout de extracción en servidor para MegaEmbed a 6000ms.
  - [x] Asegurar que si S14 extrae con éxito, se agregue como stream directo HLS en la pool unificada posición 0.

- [x] **Tarea 3: Coordinación de carga prioritaria en el cliente (`app/watch/page.tsx`)**
  - [x] Ajustar la ventana de espera de extracción a 4200ms para dar tiempo a los servidores prioritarios antes de mostrar iframe fallbacks.
  - [x] Si la reproducción ya ha comenzado (`hasStartedPlaybackRef.current`), no reemplazar `activeSource` ni reordenar la fuente en reproducción al llegar un stream tardío.
  - [x] Si la pool HLS ya está reproduciéndose, anexar silenciosamente los nuevos streams a `backupUrls` sin modificar la URL activa.

- [x] **Tarea 4: Estabilidad de montaje del reproductor (`components/player/PlayerContainer.tsx`)**
  - [x] Reemplazar `key={source.url}` por `key={source.id || source.url}` en `NativeSourcePlayer` para evitar que React desmonte el video cuando se actualizan los backups en segundo plano.
  - [x] Usar `candidateUrlsRef` y retirar `candidateUrls.length` de las dependencias de `useEffect` en `NativeSourcePlayer.tsx` para evitar reiniciar el streaming.

- [x] **Tarea 5: Pruebas y Verificación**
  - [x] Verificar `npx tsc --noEmit`.
  - [x] Probar extracción en películas y series comprobando tiempo de respuesta (<3.5s).
  - [x] Ejecutar script de verificación y pruebas automatizadas (`scripts/test-spec-084.mjs`).
  - [x] Commit y push a `origin/main`.
