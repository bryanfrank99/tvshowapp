# Spec 064: Resiliencia de Disponibilidad de Catálogo para MegaEmbed (Bypass de Bloqueo Cloudflare 403 en Vercel)

## 1. Contexto y Problema Detectado

En la Spec 063 se implementó el soporte para la API de disponibilidad en lote de MegaEmbed:
- Películas: `https://mgeb.top/api/movie`
- Series: `https://mgeb.top/api/series`

Sin embargo, al ejecutar la prueba en el entorno de producción (Vercel) desde el Panel de Administración:
- **Resultado obtenido:** `✕ Test Válido Falló: No disponible (No encontrado en catálogo)`
- **Probado [Caso Válido]:** `https://mgeb.top/api/movie` (TMDB 969681)

### Diagnóstico de Causa Raíz
1. Desde conexiones residenciales / locales (IP de usuario o navegador), `https://mgeb.top/api/movie` y `/api/series` responden con **HTTP 200 OK** y entregan el catálogo completo (~17,780 películas y ~7,707 series).
2. Sin embargo, los servidores de Vercel ejecutan funciones Serverless dentro de centros de datos de AWS (ej. región `iad1` / AWS ASN 16509).
3. `mgeb.top` está protegido por **Cloudflare Bot Management / Bot Fight Mode**, el cual intercepta y bloquea con **HTTP 403 Forbidden** (`<title>Just a moment...</title>`) todas las peticiones directas provenientes de IPs de centros de datos.
4. Cuando el administrador pulsa "Test Válido" en el panel o cuando el resolver de producción evalúa servidores disponibles en `/api/resolve`, Vercel realiza un `fetch("https://mgeb.top/api/movie")`, recibe un **403 Forbidden**, la función captura el error y retorna un `Set()` vacío, causando que todos los títulos se consideren "no disponibles".

---

## 2. Requerimientos del Sistema

### R1. Persistencia de Catálogo en Base de Datos Supabase (`config`)
- Utilizar la tabla `config` de Supabase (accesible de forma segura y directa tanto por Vercel como por scripts locales y el panel de administración).
- Almacenar los catálogos en lote bajo las claves:
  - `catalog_cache:https://mgeb.top/api/movie` (y clave normalizada sin trailing slash).
  - `catalog_cache:https://mgeb.top/api/series` (y clave normalizada sin trailing slash).
- Registrar la marca de tiempo de última sincronización en `catalog_cache_timestamp:${url}`.

### R2. Fallback Inteligente en `getRedeflixMovieSet` y `getRedeflixTvMap`
- En [`lib/redeflix-availability.ts`](file:///C:/Users/Administrator/.gemini/antigravity/scratch/tvshowapp/lib/redeflix-availability.ts):
  - Al solicitar la lista de películas (`getRedeflixMovieSet`) o series (`getRedeflixTvMap`):
    1. Intentar el `fetchWithTimeout(url)` directo.
    2. Si el fetch falla (HTTP 403 Cloudflare, timeout o error de red):
       - Consultar la base de datos Supabase (`config`) para recuperar el catálogo cacheado.
       - Si existe en Supabase, parsear el catálogo, alimentar la caché en memoria y retornar el conjunto de IDs.
    3. Si el fetch directo tiene éxito:
       - Actualizar asíncronamente Supabase en segundo plano para mantener los catálogos siempre sincronizados sin bloquear la respuesta.

### R3. Script de Sincronización Automática
- Crear script [`scripts/sync-mgeb-catalog.mjs`](file:///C:/Users/Administrator/.gemini/antigravity/scratch/tvshowapp/scripts/sync-mgeb-catalog.mjs):
  - Descarga `https://mgeb.top/api/movie` y `https://mgeb.top/api/series`.
  - Normaliza y guarda los datos en la tabla `config` de Supabase.
  - Reporta el número total de películas y series actualizadas.

### R4. Endpoint de Sincronización en Panel de Administración
- En [`app/api/admin/providers/route.ts`](file:///C:/Users/Administrator/.gemini/antigravity/scratch/tvshowapp/app/api/admin/providers/route.ts):
  - Añadir soporte para `action: "sync_catalog"` que permita sincronizar o refrescar el catálogo almacenado en Supabase a demanda.
  - Asegurar que `action: "test_availability"` consulte la caché persistente cuando la petición directa devuelva 403 de Cloudflare.

### R5. Pruebas Automatizadas y Validación
- Crear [`scripts/test-mgeb-cloudflare-bypass.mjs`](file:///C:/Users/Administrator/.gemini/antigravity/scratch/tvshowapp/scripts/test-mgeb-cloudflare-bypass.mjs) que valide:
  1. Carga de fallback desde Supabase cuando el fetch directo simula o recibe 403.
  2. Detección exitosa de película válida (TMDB 969681) -> `available: true`.
  3. Rechazo exitoso de película ficticia (TMDB 999999999) -> `available: false`.
  4. Detección exitosa de serie válida (TMDB 1396) -> `available: true`.
  5. Rechazo exitoso de serie ficticia (TMDB 999999999) -> `available: false`.
  6. Compilación TypeScript sin errores (`npm run build`).
