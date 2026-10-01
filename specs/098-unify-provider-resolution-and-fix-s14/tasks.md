# Tareas de Implementación: Especificación 098

- [x] 1. Reparación de S14 (MegaEmbed)
  - [x] 1.1 Agregar acción `megaembed_parse_sources` en `lib/hls-engine.ts`.
  - [x] 1.2 Configurar preset declarativo de MegaEmbed en `lib/hls-engine.ts`.
  - [x] 1.3 Ajustar timeouts y resiliencia en `lib/megaembed.ts`.
  - [x] 1.4 Validar extracción de S14 en películas y series con script de prueba.
- [x] 2. Unificación de Resolución en `app/api/resolve/route.ts`
  - [x] 2.1 Eliminar bifurcaciones específicas (`if prov.id === ...`) de Cinecalidad, PlayerFlix, NasriPlay, MegaEmbed y WatchPlay.
  - [x] 2.2 Implementar ciclo uniforme de extracción, caché y fuentes para todos los proveedores.
  - [x] 2.3 Sincronizar `fallbackExtractorConfigs` con `EXTRACTOR_PRESETS`.
- [x] 3. Persistencia en Base de Datos y Supabase
  - [x] 3.1 Actualizar pipelines en `supabase/seed.sql`.
  - [x] 3.2 Ejecutar script para actualizar `providers.extractor_config` y `config.provider_extractor_configs` en Supabase.
- [x] 4. Verificación y Compilación
  - [x] 4.1 Probar extracción multiserver con `test-hls-engine.mjs`.
  - [x] 4.2 Probar resolución end-to-end con script de prueba.
  - [x] 4.3 Ejecutar `npm run build` y certificar 0 errores.
