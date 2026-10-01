# Tareas de Implementación: Especificación 095

- [x] 1. Base de Datos Supabase y Semilla
  - [x] 1.1 Actualizar registro `nasriplay` en tabla `providers` de Supabase (`movie_tpl`, `tv_tpl`, `name`).
  - [x] 1.2 Actualizar `supabase/seed.sql` con la definición corregida de S17.
- [x] 2. Extractor de Streams y Mirrors (`lib/nasriplay.ts`)
  - [x] 2.1 Incluir `playUrl` (stream proxy) como stream HLS nativo.
  - [x] 2.2 Resolver en paralelo todos los streams HLS directos elegibles para poblar `backupHlsUrls`.
  - [x] 2.3 Resolver en paralelo las URLs reales de los mirrors de iframe mediante `/api/v1/embed/server-url`.
  - [x] 2.4 Mapear nombres legibles de servidores en `embedOptions`.
- [x] 3. Validación y Pruebas
  - [x] 3.1 Crear script de prueba `scripts/test-s17-multi-mirror.mjs`.
  - [x] 3.2 Validar que S17 entrega múltiples `backupHlsUrls` y múltiples `embedOptions`.
  - [x] 3.3 Ejecutar `npm run build` y asegurar 0 errores.
