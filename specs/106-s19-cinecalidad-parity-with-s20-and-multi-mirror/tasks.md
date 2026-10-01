# Tareas de Implementación - Spec 106

- [x] 1. Motor de Extracción Declarativo para S19 (`lib/hls-engine.ts`)
  - [x] 1.1 Implementar acción `cinecalidad_resolve_embeds` en el ejecutor de pipelines.
  - [x] 1.2 Actualizar preset `vimeos_json` en `EXTRACTOR_PRESETS` para usar `cinecalidad_resolve_embeds`.
  - [x] 1.3 Preservar todos los links de mirrors originales en la salida `embeds`.
- [x] 2. Configuración en APIs de Backend
  - [x] 2.1 En `app/api/resolve/route.ts`: default stream mode `"both"` para `cinecalidad`.
  - [x] 2.2 En `app/api/admin/providers/route.ts`: default stream mode `"both"` para `cinecalidad`.
  - [x] 2.3 Actualizar `supabase/seed.sql` con los endpoints directos de `cinecalidad`.
- [x] 3. Persistencia en Base de Datos Supabase
  - [x] 3.1 Actualizar tabla `providers` en Supabase con los endpoints directos originales de Cinecalidad.
  - [x] 3.2 Actualizar `provider_extractor_configs` y `provider_stream_modes` en la tabla `config` de Supabase.
- [x] 4. Pruebas y Despliegue
  - [x] 4.1 Crear y ejecutar script de prueba certificando resolución HLS y múltiples mirrors de Cinecalidad.
  - [x] 4.2 Compilar con `npm run build` certificando cero errores.
  - [x] 4.3 Commit y push a `main`.
