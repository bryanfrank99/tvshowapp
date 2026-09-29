# Spec 056: Verificación de Disponibilidad de Contenido para RedeFlix (`redeflixapi.store`)

## 1. Contexto y Problema
El proveedor **RedeFlix** (`id: "redeflix"`, dominio `redeflixapi.store`) proporciona contenido en portugués para películas y series. Anteriormente, el resolver (`/api/resolve`) incluía este servidor como opción para cualquier título si el proveedor estaba activo, sin verificar si el catálogo de RedeFlix realmente disponía de dicho contenido.

Cuando un usuario abría un título o episodio que no estaba en el catálogo de RedeFlix, el reproductor mostraba una pantalla de error o contenido no disponible.

Sin embargo, el servidor `redeflixapi.store` expone públicamente listas actualizadas con todos sus identificadores TMDB indexados:
- **Películas**: `https://redeflixapi.store/list-movie-ids.txt` (archivo de texto plano con más de 23,500 IDs TMDB, uno por línea).
- **Series y Episodios**: `https://redeflixapi.store/list-tv-ids.txt` (JSON estructurado con más de 6,500 series, cada una con su `id_tmdb` y desglose de `episodios` por temporada y episodio: `{"tipo":"tv","items":[{"id_tmdb":224011,"episodios":{"2":{"13":"..."}}}]}`).
- **Listas complementarias de series**: `https://redeflixapi.store/list-anime-ids.txt` y `https://redeflixapi.store/list-dorama-ids.txt` (mismo formato JSON para animes y doramas).

## 2. Requerimiento del Negocio
> *"El servidor 'redeflixapi.store' tiene unas listas con las cuales podemos comprobar si tienen el contenido disponible (ejemplo para series y películas: list-tv-ids.txt, list-movie-ids.txt). Usar esto a nuestro favor y solo mostrar este servidor cuando el contenido esté disponible en él."*

## 3. Especificación Funcional

### A. Módulo de Verificación (`lib/redeflix-availability.ts`)
1. **Descarga y Caché en Memoria**:
   - Para no degradar la latencia de las peticiones a `/api/resolve`, los datos deben mantenerse en un caché en memoria con tiempo de vida (TTL) de 6 horas.
   - El catálogo de películas (`list-movie-ids.txt`, ~160 KB) y el catálogo de series (`list-tv-ids.txt`, ~10 MB) se gestionan de forma independiente para que las resoluciones de películas nunca esperen la descarga del JSON de series.
   - Estructuras en memoria optimizadas para búsqueda instantánea $O(1)$:
     - Películas: `Set<string>` de IDs TMDB.
     - Series: `Map<string, Record<string, Record<string, string>>>` indexado por `id_tmdb` (string).
2. **Consultas de Disponibilidad**:
   - `isRedeflixAvailable(type, tmdbId, season?, episode?)`:
     - Para `type === "movie"`: Comprueba si `movieSet.has(String(tmdbId))`.
     - Para `type === "tv"`: Comprueba si `tvMap.has(String(tmdbId))`. Si se proporcionan `season` y `episode`, valida adicionalmente si `tvMap.get(id)?.[String(season)]?.[String(episode)]` existe.
3. **Resiliencia y Fallback**:
   - Si la red o `redeflixapi.store` falla o agota el tiempo de espera (timeout configurable con `AbortSignal`), se utiliza la versión en caché existente si está disponible (patrón stale-while-revalidate).
   - En caso de fallo total en frío sin caché previa, se registra la advertencia y se degrada elegantemente sin interrumpir la resolución de los demás servidores.

### B. Integración en `/api/resolve` ([`app/api/resolve/route.ts`](file:///C:/Users/Administrator/.gemini/antigravity/scratch/tvshowapp/app/api/resolve/route.ts))
1. Durante la construcción de `eligibleProviders`:
   - Si el proveedor es RedeFlix (`p.id === "redeflix"` o su template apunta a `redeflixapi.store`):
     - Obtener `effectiveTmdbId`. Si no se dispone de ID TMDB, se descarta RedeFlix (requiere TMDB obligatoriamente).
     - Consultar `isRedeflixAvailable(type, effectiveTmdbId, s, e)`.
     - Si el contenido **NO** está disponible en RedeFlix, el servidor se omite de la lista de fuentes disponibles (`sources`).
     - Si el contenido **SÍ** está disponible, se incluye normalmente.

### C. Integración en `/api/embed-url` ([`app/api/embed-url/route.ts`](file:///C:/Users/Administrator/.gemini/antigravity/scratch/tvshowapp/app/api/embed-url/route.ts))
- Si se solicita explícitamente la URL de RedeFlix pero el contenido no existe en sus listas, devolver `{ error: "not_available", message: "Contenido no disponible en RedeFlix" }` con status 404.

## 4. Criterios de Aceptación
1. Una película disponible en `list-movie-ids.txt` (ej. Fight Club TMDB 550) muestra el servidor RedeFlix en `/api/resolve`.
2. Una película NO listada en `list-movie-ids.txt` (ej. ID ficticio 999999999) **NO** muestra el servidor RedeFlix en `/api/resolve`.
3. Una serie y episodio disponibles en `list-tv-ids.txt` (ej. TMDB 1664 S1E1) muestra el servidor RedeFlix en `/api/resolve`.
4. Una serie o episodio inexistente en `list-tv-ids.txt` (ej. TMDB 1664 S1E99 o ID 999999999) **NO** muestra el servidor RedeFlix en `/api/resolve`.
5. La latencia de `/api/resolve` se mantiene inferior a 50ms para peticiones con caché caliente.
6. La aplicación y suite de pruebas compilan y pasan al 100%.
