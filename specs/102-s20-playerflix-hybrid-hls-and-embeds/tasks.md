# Tareas de Implementación - Spec 102

- [x] 1. Extracción Híbrida en `lib/hls-engine.ts`
  - [x] 1.1 Enriquecer `playerflix_resolve_options` para extraer streams HLS concurrentemente de WatchPlay y VIP Player.
  - [x] 1.2 Configurar `EXTRACTOR_PRESETS.playerflix` para mapear `hlsUrl` y `backupHlsUrls` hacia la salida.
- [x] 2. Actualización de Base de Datos y Semilla
  - [x] 2.1 Actualizar configuración de PlayerFlix en `supabase/seed.sql`.
  - [x] 2.2 Sincronizar la base de datos de Supabase en vivo y bump de versión.
- [x] 3. Pruebas y Certificación
  - [x] 3.1 Probar película `687163` y serie `1399` para confirmar emisión dual de `hlsUrl` y `embeds`.
  - [x] 3.2 Ejecutar `npm run build` y certificar compilación limpia.
