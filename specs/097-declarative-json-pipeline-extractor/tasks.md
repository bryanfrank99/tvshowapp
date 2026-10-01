# Tareas de Implementación: Especificación 097

- [x] 1. Motor de Pipeline Declarativo (`lib/hls-engine.ts`)
  - [x] 1.1 Definir interfaces `PipelineStep`, `PipelineExtractorConfig` y `StepTrace`.
  - [x] 1.2 Implementar resolución de variables y templates (`resolveValue`, `resolveTemplate`).
  - [x] 1.3 Implementar algoritmo de desempaquetado de Packer (`unpackPackerScript`).
  - [x] 1.4 Implementar despachador de acciones (`executePipelineStep`).
  - [x] 1.5 Implementar `executePipeline` y conectarlo a `runHlsExtractor`.
- [x] 2. Presets Declarativos de Extracción
  - [x] 2.1 Reemplazar preset de Cinecalidad con pipeline JSON completo de 6 pasos.
  - [x] 2.2 Reemplazar presets de NasriPlay, PlayerFlix, MegaEmbed, WatchPlay y Directo.
- [x] 3. Base de Datos y Supabase
  - [x] 3.1 Actualizar registros en Supabase con los nuevos pipelines declarativos.
  - [x] 3.2 Actualizar `supabase/seed.sql` y script de migración.
- [x] 4. Panel Administrativo (`app/admin/page.tsx`)
  - [x] 4.1 Mostrar traza de ejecución de pasos (`stepTraces`) en el panel de Live Test.
- [x] 5. Validación y Pruebas
  - [x] 5.1 Ejecutar prueba con `scripts/test-hls-engine.mjs`.
  - [x] 5.2 Ejecutar `npm run build` y verificar 0 errores.
