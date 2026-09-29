# Spec 060: Soporte Dual de Identificadores (IMDb y TMDB) en la Comprobación de Disponibilidad

## 1. Contexto y Problema
En las especificaciones 056, 057 y 059, el sistema de comprobación de disponibilidad verificaba principalmente identificadores numéricos de TMDB (rechazando explícitamente cadenas que empezaran por `tt` con `if (!tmdbStr || tmdbStr.startsWith("tt")) return false;`).

Sin embargo, los diferentes proveedores y APIs de streaming externos manejan identificadores heterogéneos:
1. Algunos servidores y APIs de comprobación requieren **IMDb ID** (ej. `tt0903747`, `tt6263850`).
2. Otros servidores requieren **TMDB ID** (ej. `1396`, `969681`).
3. Otros sistemas permiten o requieren **ambos** identificadores (ej. endpoints como `/check?tmdb={tmdb}&imdb={imdb}` o listas de catálogo en lote donde algunos elementos tienen `id_imdb` y otros `id_tmdb`).

## 2. Requerimiento del Negocio
> *"en el sistema de Comprobación de Disponibilidad necesitamos generar 2 tipos de id ya que los sostemas pueden usar imdb, tmdb o ambos, usa sdd"*

## 3. Especificación Funcional

### A. Soporte de Placeholders en URLs de Comprobación (Probe URLs)
El sistema debe reconocer y reemplazar limpiamente:
- `{tmdb}`: ID numérico de TMDB (ej. `969681` para películas, `1396` para series).
- `{imdb}`: ID alfanumérico de IMDb (ej. `tt6263850` para películas, `tt0903747` para series).
- `{id}`: Placeholder universal inteligente:
  - Si el proveedor tiene `needs_tmdb: true` o la URL tiene contexto TMDB, usa TMDB ID.
  - Si el proveedor tiene `needs_tmdb: false` o la URL es estilo IMDb, usa IMDb ID.
  - Si solo uno de los dos IDs está disponible para el título, usa el ID disponible.
- URLs con ambos placeholders: ej. `https://api.servidor.com/verify?tmdb={tmdb}&imdb={imdb}` interpola ambos valores simultáneamente.

### B. Normalización Inteligente de URLs Directas de Ejemplo
Si el administrador ingresa un enlace de ejemplo con IDs fijos:
- Con ID numérico: `https://v2.watchplay.shop/movie/969681` → normaliza a `.../movie/{id}` o `{tmdb}`.
- Con ID de IMDb: `https://v2.watchplay.shop/movie/tt6263850` → normaliza a `.../movie/{imdb}`.
- Con series: `https://v2.watchplay.shop/tvshow/tt0903747/1/1` → normaliza a `.../tvshow/{imdb}/{s}/{e}`.

### C. Soporte Dual en Catálogos en Lote (TXT y JSON)
- **Listas TXT**:
  - Un archivo TXT puede contener tanto IDs de TMDB (`969681`) como de IMDb (`tt0903747`).
  - Al consultar disponibilidad, si el título dispone de `tmdbId` y `imdbId`, se comprueba si la lista contiene `tmdbId` **o** `imdbId`. Si cualquiera de los dos coincide, el contenido se considera disponible.
- **Catálogos JSON**:
  - Al procesar arrays de objetos o estructuras con `items`:
    - Se extraen y guardan en el set/map tanto claves TMDB (`id_tmdb`, `tmdb_id`, `tmdb`) como claves IMDb (`id_imdb`, `imdb_id`, `imdb`).
    - La consulta de disponibilidad valida por TMDB o por IMDb.

### D. Resolución de IDs en el Resolver (`app/api/resolve/route.ts`)
- Cuando cualquier proveedor requiera comprobación de disponibilidad o adaptación:
  - Si el usuario solicitó un IMDb (`tt...`), se resuelve también su `effectiveTmdbId`.
  - Si el usuario solicitó un TMDB numérico, se resuelve también su `effectiveImdbId`.
- Al invocar la disponibilidad:
  - Se pasan ambos IDs: `{ tmdbId: effectiveTmdbId, imdbId: effectiveImdbId, ... }`.
  - El verificador ya no descarta IDs que comiencen por `tt`.

### E. Panel de Administración y Herramienta de Prueba
- En `app/admin/page.tsx` y `app/api/admin/providers/route.ts`:
  - Se informa claramente el soporte para `{tmdb}`, `{imdb}`, `{id}`, `{s}`, `{e}`.
  - La herramienta de prueba ("Probar Disponibilidad") suministra tanto el ID de TMDB de muestra como el ID de IMDb correspondiente:
    - Película: TMDB `969681`, IMDb `tt6263850`
    - Serie: TMDB `1396`, IMDb `tt0903747` (Temporada 1, Episodio 1)

## 4. Criterios de Aceptación
1. Una Probe URL configurada con `{imdb}` (ej. `https://api.example.com/movie/{imdb}`) se interpola con el IMDb ID (`tt...`).
2. Una Probe URL configurada con `{tmdb}` se interpola con el TMDB ID numérico.
3. Una Probe URL configurada con ambos `{tmdb}` y `{imdb}` interpola ambos campos en la misma URL.
4. Las listas de catálogo en lote (TXT o JSON) admiten verificar títulos tanto si están listados por TMDB como si están listados por IMDb.
5. El resolver en `/api/resolve` resuelve ambos IDs (IMDb y TMDB) para asegurar que ningún servidor sea descartado por falta de conversión de ID.
6. Toda la suite de tests existente y nueva pasa al 100% y `npm run build` compila sin errores.
