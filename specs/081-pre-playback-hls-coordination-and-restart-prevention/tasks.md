# Tasks: Spec 081 - Coordinación Pre-Reproducción de Servidores HLS y Prevención de Reinicio de Streaming

- [x] **Tarea 1: Refactorizar la función de extracción y coordinación en `app/watch/page.tsx`**
  - [x] Agrupar las extracciones de candidatos prioritarios (MegaEmbed S14, WatchPlay S18, NasriPlay S17) en un ejecutor coordinado en paralelo.
  - [x] Implementar timeout límite (máximo 2.8s) para no bloquear la experiencia si un servidor no responde.
  - [x] Consolidar todas las respuestas obtenidas en la Pool HLS correspondiente (con sus servidores enlazados `backupUrls` y `urlServerMap`) antes de desactivar `loading`.
  - [x] Llamar a `setSources` y `setRecommendedSourceId` con la lista final ordenada en posición 0, y finalizar con `setLoading(false)`.

- [x] **Tarea 2: Protección contra reinicio durante reproducción activa**
  - [x] En caso de actualizaciones asíncronas tardías, verificar si la reproducción ya comenzó (`hasStartedPlaybackRef.current`).
  - [x] Conectar `onLoad` en `NativeSourcePlayer` y `PlayerContainer` para registrar el inicio de reproducción.
  - [x] Si la reproducción ya está en curso, prohibir la alteración de `recommendedSourceId` o de la URL del stream en curso, manteniendo intacto el estado del reproductor.

- [x] **Tarea 3: Verificación y Pruebas**
  - [x] Crear script de validación que simule la carga asíncrona de servidores y compruebe que no se produce conmutación una vez iniciada la reproducción.
  - [x] Verificar con `npx tsc --noEmit`.

- [x] **Tarea 4: Documentación y Commit**
  - [x] Actualizar `tasks.md`.
  - [x] Realizar commit y push a `origin/main`.
