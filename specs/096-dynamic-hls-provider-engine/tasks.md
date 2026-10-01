# Tareas de Implementación: Especificación 096

- [x] 1. Motor Unificado de Extracción HLS
  - [x] 1.1 Crear `lib/hls-engine.ts` con interfaz `ExtractorConfig` y función `runHlsExtractor`.
  - [x] 1.2 Implementar soporte de presets (`vimeos_json`, `nasriplay_token`, `playerflix`, `megaembed`, `watchplay`, `direct_m3u8`, `custom_api`).
- [x] 2. Backend Administrativo y Migración de BD
  - [x] 2.1 Crear `supabase/migration_provider_extractor_config.sql`.
  - [x] 2.2 Actualizar `app/api/admin/providers/route.ts` con soporte para `extractor_config` y acción `test_extractor`.
  - [x] 2.3 Actualizar registros en la base de datos de Supabase desactivando embeds y asignando configs a los servidores HLS.
  - [x] 2.4 Actualizar `supabase/seed.sql`.
- [x] 3. Interfaz de Administración en `/admin`
  - [x] 3.1 Integrar selector de presets HLS y editor JSON en el formulario de proveedor en `app/admin/page.tsx`.
  - [x] 3.2 Añadir botón y panel de "▶ Probar Extractor en Vivo" en el admin.
  - [x] 3.3 Añadir switch global para "Solo Servidores HLS / Permitir Embeds de Respaldo".
- [x] 4. Integración en el Resolver (`app/api/resolve/route.ts`)
  - [x] 4.1 Respetar filtro estricto de solo HLS cuando el modo de respaldo de embeds esté desactivado.
  - [x] 4.2 Conectar el motor dinámico de extracción.
- [x] 5. Pruebas y Validación
  - [x] 5.1 Crear y ejecutar `scripts/test-hls-engine.mjs`.
  - [x] 5.2 Compilación limpia con `npm run build`.
