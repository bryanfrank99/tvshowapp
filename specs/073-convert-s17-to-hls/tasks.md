# Tasks: Spec 073 - Conversión de S17 (NasriPlay) a HLS Nativo

- [x] **Tarea 1: Extractor Directo HLS (`lib/nasriplay.ts`)**
  - [x] Implementar extracción de `PAGE_TOKEN` desde la página de embed de `nsrplay.space`.
  - [x] Consultar `/api/v1/embed/sources/...` con el token de página.
  - [x] Extraer stream HLS directo (`directUrl`) y enlaces de respaldo (`backupHlsUrls`).
  - [x] Exportar `fetchNasriPlayStream`.

- [x] **Tarea 2: Integración en Resolutor Central (`app/api/resolve/route.ts`)**
  - [x] Integrar verificación de caché Supabase (`getCachedStream`) para `providerId: "nasriplay"`.
  - [x] Extraer stream fresco y persistir en Supabase con TTL de 12 horas.
  - [x] Generar fuente `type: "hls"`, `languages: ["es", "lat"]` con fallback a iframe si falla la extracción.
  - [x] Permitir consolidación en el Pool HLS Español / Latino con failover cruzado con S19 (Cinecalidad).

- [x] **Tarea 3: Configuración Administrativa y Base de Datos**
  - [x] Actualizar `fallbackHlsConfig` en `app/api/admin/providers/route.ts` para incluir `nasriplay`.
  - [x] Actualizar registro `provider_hls_config` en tabla `config` de Supabase.
  - [x] Actualizar `supabase/seed.sql`.

- [x] **Tarea 4: Verificación y Pruebas Automatizadas**
  - [x] Crear script `scripts/test-nasriplay-hls.mjs` que verifique extracción de películas y series de TV.
  - [x] Validar con `npx tsc --noEmit`.
