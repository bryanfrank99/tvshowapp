# Tareas de Implementación - Spec 108

- [x] 1. Actualización de Dominio y Endpoints de Cinecalidad
  - [x] 1.1 Cambiar `tmdb.allcalidad.re` por `tmdb.cinecalidad.am` en `lib/cinecalidad.ts`.
  - [x] 1.2 Cambiar `tmdb.allcalidad.re` por `tmdb.cinecalidad.am` en `lib/hls-engine.ts` (presets `cinecalidad` y `vimeos_json`).
  - [x] 1.3 Cambiar `tmdb.allcalidad.re` por `tmdb.cinecalidad.am` en `supabase/seed.sql`.
- [x] 2. Optimización del Motor de Extracción HLS (`lib/hls-engine.ts`)
  - [x] 2.1 En `cinecalidad_resolve_embeds`, procesar todas las opciones devueltas por la API original (`vimeos`, `goodstream`, etc.) generando el arreglo `embeds` estructurado.
  - [x] 2.2 Eliminar el desempaquetado de servidor bloqueado por IP de Vimeos para evitar streams rotos, emitiendo opciones multi-mirror directas.
- [x] 3. Limpieza de Código Legacy en Reproductor (`app/watch/page.tsx`)
  - [x] 3.1 Eliminar la tarea background client-side que llamaba a `/api/cinecalidad?stream=1`.
  - [x] 3.2 Eliminar el interceptor de click que mutaba la fuente iframe de Cinecalidad a HLS.
- [x] 4. Sincronización en Base de Datos Supabase
  - [x] 4.1 Actualizar `movie_tpl` y `tv_tpl` de `cinecalidad` en la tabla `providers`.
  - [x] 4.2 Actualizar `provider_extractor_configs.cinecalidad` en `config`.
  - [x] 4.3 Purgar caché de streams para `cinecalidad`.
- [x] 5. Pruebas y Despliegue
  - [x] 5.1 Ejecutar prueba de resolución de serie 247718 S01E03 y película 550 verificando la tarjeta multi-mirror con Vimeos y Goodstream.
  - [x] 5.2 Compilar con `npm run build` certificando cero errores.
  - [x] 5.3 Commit y push a `main`.
