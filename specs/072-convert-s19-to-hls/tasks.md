# Tasks: Spec 072 - Conversión de S19 (Cinecalidad) a HLS Nativo

- [x] **Tarea 1: Extractor Directo HLS y Tipos (`lib/cinecalidad.ts`)**
  - [x] Implementar algoritmo de desempaquetado y extracción de URL `.m3u8` desde `vimeos.net`.
  - [x] Extraer pistas de subtítulos VTT asociadas.
  - [x] Implementar `fetchCinecalidadStream(opts: CinecalidadFetchOptions)`.

- [x] **Tarea 2: Caché y Endpoint Dedicado (`app/api/cinecalidad/route.ts`)**
  - [x] Integrar `stream-cache.ts` para persistencia en Supabase (TTL 12 horas).
  - [x] Soportar parámetro `stream=1` o `hls=1` para devolver JSON del stream directo HLS.

- [x] **Tarea 3: Integración en Resolutor Central (`app/api/resolve/route.ts`)**
  - [x] Resolver Cinecalidad (S19) como fuente `type: "hls"` cuando el stream directo esté disponible.
  - [x] Mantener fallback a iframe si la extracción no está disponible para un contenido específico.
  - [x] Integrar S19 en el Pool HLS consolidado de audio Español / Latino.

- [x] **Tarea 4: Actualización de Base de Datos y Seed (`supabase/seed.sql`)**
  - [x] Actualizar en Supabase `config.provider_hls_config` con `cinecalidad: { enabled: true, extractor: "direct" }`.
  - [x] Actualizar `supabase/seed.sql`.

- [x] **Tarea 5: Pruebas Automatizadas y Verificación**
  - [x] Crear script de prueba `scripts/test-cinecalidad-hls.mjs` que verifique extracción y resolución HLS (10/10 pruebas superadas).
  - [x] Verificar con `npx tsc --noEmit` (0 errores).
