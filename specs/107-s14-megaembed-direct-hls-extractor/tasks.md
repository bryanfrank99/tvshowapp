# Tareas de Implementación - Spec 107

- [x] 1. Motor de Extracción Declarativo para S14 (`lib/hls-engine.ts`)
  - [x] 1.1 Actualizar acción `megaembed_parse_sources` para normalizar URLs y generar array `embeds` estructurado.
  - [x] 1.2 Actualizar preset `megaembed` en `EXTRACTOR_PRESETS` para incluir `"embeds": "{{mega_streams.embeds}}"` en el output.
- [x] 2. Configuración en Backend APIs y Panel de Control
  - [x] 2.1 En `app/api/resolve/route.ts`: default stream mode `"both"` para `megaembed`.
  - [x] 2.2 En `app/api/admin/providers/route.ts`: default stream mode `"both"` para `megaembed`.
  - [x] 2.3 En `app/admin/page.tsx`: default stream mode `"both"` para `megaembed`.
  - [x] 2.4 Actualizar `supabase/seed.sql` con la definición completa del pipeline de `megaembed`.
- [x] 3. Sincronización en Base de Datos Supabase
  - [x] 3.1 Activar `megaembed` (`active = true`) en la tabla `providers`.
  - [x] 3.2 Actualizar `provider_extractor_configs.megaembed` y `provider_stream_modes.megaembed` (`both`) en `config`.
  - [x] 3.3 Limpiar caché de streams para `megaembed`.
- [x] 4. Pruebas y Despliegue
  - [x] 4.1 Ejecutar `scripts/test-s14-hybrid.mjs` validando película 550, serie 1399/1/1 y `/api/resolve`.
  - [x] 4.2 Compilar con `npm run build` certificando cero errores.
  - [x] 4.3 Commit y push a `main`.
