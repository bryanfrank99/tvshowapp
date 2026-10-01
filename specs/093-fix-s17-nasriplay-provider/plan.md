# Plan de Implementación: Spec 093 - Corrección Integral de S17 (NasriPlay)

## 1. Configuración de Base de Datos y Caché de Proveedores
- Actualizar `providers` en Supabase para `nasriplay`:
  - `movie_tpl = "https://nsrplay.space/embed/movie/{id}"`
  - `tv_tpl = "https://nsrplay.space/embed/tv/{id}/{s}/{e}"`
  - `movie_list_url = ""`
  - `tv_list_url = ""`
- Actualizar `config` (`provider_availability_urls`) para remover la clave `nasriplay`.
- Incrementar `providers_version` para invalidar cachés del cliente.

## 2. Creación del Endpoint `app/api/nasriplay/route.ts`
- Implementar `GET /api/nasriplay?id=...&type=...&s=...&e=...`
- Conectar con `fetchNasriPlayStream` server-side.
- Cachear resultados en Supabase Stream Cache (`setCachedStream`) con TTL de 12 horas.
- Responder con CORS abierto y cache control.

## 3. Optimización de `lib/nasriplay.ts`
- Al recibir `data.servers`:
  - Si un servidor ya incluye `directUrl` (ej. Vimeos o Uqload con HLS `.m3u8`), utilizarlo de inmediato sin consultar `/resolve` ni `/server-url` innecesariamente.
  - Para los servidores iframe restantes, construir la lista de `embedOptions` directamente con `srv.name`, `srv.server`, `srv.language` y fallback a `embedUrl` o resolver únicamente cuando no se disponga de URL.
  - Reducir el tiempo de ejecución a <2 segundos y evitar el error HTTP 429.

## 4. Adaptación de `app/watch/page.tsx`
- En `extractionTasks` para `nasriItem`: consultar `/api/nasriplay?id=${targetId}&type=${type}&s=${s}&e=${e}` en lugar de `import("@/lib/nasriplay")`.
- En `onSelectSource`: consultar `/api/nasriplay` y actualizar dinámicamente el estado local de fuentes.

## 5. Pruebas y Certificación
- Crear `scripts/test-nasriplay-provider.mjs` con verificación de películas (550, 969681, 157336) y series (1399).
- Verificar `npm run build`.
