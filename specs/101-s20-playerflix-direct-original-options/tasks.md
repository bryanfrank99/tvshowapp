# Tareas de Implementación - Spec 101

- [x] 1. Motor Declarativo JSON en `lib/hls-engine.ts`
  - [x] 1.1 Registrar acción `playerflix_resolve_options` en `PipelineStep`.
  - [x] 1.2 Implementar `playerflix_resolve_options` en `executeStep` para parsear `data.options` a URLs originales.
  - [x] 1.3 Configurar preset declarativo `EXTRACTOR_PRESETS.playerflix`.
- [x] 2. Configuración Persistente en Base de Datos `supabase/seed.sql`
  - [x] 2.1 Actualizar configuración de `playerflix` en `provider_extractor_configs`.
  - [x] 2.2 Actualizar plantillas `movie_tpl` y `tv_tpl` de S20 en `providers`.
- [x] 3. Resolver de Reproducción `app/api/resolve/route.ts`
  - [x] 3.1 Asegurar que `embedOptions` de S20 entregue URLs originales externas sin rutas a `/api/playerflix/proxy`.
- [x] 4. Pruebas y Certificación
  - [x] 4.1 Probar extracción de película (`687163`, `550`) y serie (`1399`) mediante script.
  - [x] 4.2 Ejecutar `npm run build` y certificar compilación limpia.
