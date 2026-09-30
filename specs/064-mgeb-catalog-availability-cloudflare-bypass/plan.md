# Plan de Implementación: Spec 064 - Bypass de Bloqueo Cloudflare 403 para Catálogo MegaEmbed

## Arquitectura de la Solución

```
+-------------------------------------------------------------+
|                      Cliente / Admin Panel                   |
|  - Pulsa "Test Válido" / "Test Inválido"                    |
|  - Opcional: "Sincronizar Catálogo"                         |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                    Vercel Serverless Function               |
|      (app/api/admin/providers o app/api/resolve)            |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|               lib/redeflix-availability.ts                  |
|                                                             |
|   1. Intenta fetchWithTimeout("https://mgeb.top/api/movie") |
|          |                                                  |
|          +--- [HTTP 403 Cloudflare o Error de Red]          |
|          |                                                  |
|          v                                                  |
|   2. Fallback a Supabase:                                   |
|      SELECT value FROM config                               |
|      WHERE key = 'catalog_cache:https://mgeb.top/api/movie' |
|          |                                                  |
|          v                                                  |
|   3. Parseo y almacenamiento en memoria (movieCache/tvCache)|
|          |                                                  |
|          v                                                  |
|   4. Evaluación O(1) de ID TMDB / IMDb                      |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                   Supabase Database (`config`)              |
|   - Almacena JSON crudo con IDs actualizados                |
|   - Clave: catalog_cache:https://mgeb.top/api/movie (~211KB)|
|   - Clave: catalog_cache:https://mgeb.top/api/series (~88KB)|
|   - Nunca bloqueado por Cloudflare                          |
+-------------------------------------------------------------+
```

## Fases de Ejecución

### Fase 1: Extensión de `lib/redeflix-availability.ts`
- Implementar funciones auxiliares:
  - `fetchCatalogFromSupabase(url: string): Promise<string | null>`
  - `saveCatalogToSupabase(url: string, content: string): Promise<void>`
- En `getRedeflixMovieSet`: ante error o status 403, recuperar de Supabase.
- En `getRedeflixTvMap`: ante error o status 403, recuperar de Supabase.
- Si el fetch directo tiene éxito, guardar en Supabase en segundo plano.

### Fase 2: Script de Sincronización Automática
- Crear `scripts/sync-mgeb-catalog.mjs`:
  - Lee variables de entorno de Supabase.
  - Descarga `https://mgeb.top/api/movie` y `https://mgeb.top/api/series`.
  - Upsert en `config` en Supabase con timestamps.
  - Ejecutarlo inmediatamente para pre-cargar la base de datos de producción.

### Fase 3: Integración en API de Administración
- En `app/api/admin/providers/route.ts`:
  - Enriquecer `action === "test_availability"` para retornar bandera de procedencia (directo o caché Supabase).
  - Añadir soporte para `action === "sync_catalog"` para permitir forzar una recarga manual desde el panel si es necesario.

### Fase 4: Pruebas y Validación SDD
- Crear `scripts/test-mgeb-cloudflare-bypass.mjs`.
- Ejecutar pruebas automatizadas.
- Comprobar build con `npm run build`.
