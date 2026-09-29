# Spec 059: Sistema Flexible de Disponibilidad de Catálogo (Listas en lote, JSON completo, APIs y Links de comprobación)

## 1. Contexto y Problema
En las especificaciones 056 y 057, se implementó la comprobación de disponibilidad mediante descargas periódicas de listas en lote (archivos `.txt` con líneas de IDs como en RedeFlix o JSONs de catálogo con `items`).

Sin embargo, los diferentes proveedores de streaming utilizan distintos mecanismos para verificar si tienen un contenido:
1. **Listas completas en lote (Batch Lists)**: Archivos `.txt` o `.json` con toda la base de datos de IDs (ej. `https://redeflixapi.store/list-movie-ids.txt`).
2. **APIs y Catálogos JSON completos**: Endpoints JSON que entregan diccionarios, arrays de IDs o arrays de objetos.
3. **Links de comprobación puntual (Probe URLs)**: Enlaces directos o endpoints por título/episodio, por ejemplo:
   - Películas: `https://v2.watchplay.shop/movie/969681` o `https://v2.watchplay.shop/movie/{id}`
   - Series: `https://v2.watchplay.shop/tvshow/1396/1/1` o `https://v2.watchplay.shop/tvshow/{id}/{s}/{e}`
   Donde el servidor devuelve HTTP 200 si el título existe, o HTTP 404 / mensaje de no encontrado si no está disponible.

## 2. Requerimiento del Negocio
> *"Quiero que modifiques el sistema de 'Listas de Disponibilidad de Catálogo (Opcional)' ya que puede ser un json con toda la data, una api o un link de comprobacion ejemplo: https://v2.watchplay.shop/movie/969681 https://v2.watchplay.shop/tvshow/1396/1/1 usa SDD"*

## 3. Especificación Funcional

### A. Detección Inteligente del Modo de Verificación
Cada proveedor puede configurar:
- `movie_list_url`: URL de disponibilidad para películas.
- `tv_list_url`: URL de disponibilidad para series/episodios.
- `anime_list_url`: URL complementaria para animes.
- `dorama_list_url`: URL complementaria para doramas.

El sistema clasifica automáticamente cada URL según su patrón:

1. **Modo Link de Comprobación Puntual (Probe URL / API)**:
   - Se activa si la URL contiene placeholders explícitos: `{id}`, `{tmdb}`, `{imdb}`, `{s}`, `{season}`, `{e}`, `{episode}`.
   - O si se ingresó un link de ejemplo con ID numérico específico (ej. `.../movie/969681` o `.../tvshow/1396/1/1`): el sistema normaliza automáticamente los segmentos numéricos a `{id}`, `{s}`, `{e}`.
   - **Ejecución**:
     - Al resolver una película o serie, se genera la URL interpolada (ej. `https://v2.watchplay.shop/movie/969681`).
     - Se realiza una petición HTTP rápida (primero `HEAD`, o `GET` con timeout de 3.5 segundos).
     - Si el status es 200 y el cuerpo no contiene textos de error conocidos (como "não encontrado", "not found", `"status":404`, `"found":false`), el contenido se considera **Disponible** (`true`).
     - Si el status es 404 o el cuerpo indica no disponible, se considera **No disponible** (`false`).
     - **Caché en memoria**: Los resultados de comprobación puntual se guardan en un `Map` en memoria con TTL de 30 minutos, evitando llamadas repetidas.

2. **Modo Catálogo Completo / Lista en Lote (Batch List / Full JSON / TXT)**:
   - Se activa si la URL apunta a una lista global (archivos `.txt` con IDs, archivos `.json` con colecciones completas, endpoints de exportación).
   - **Soporte de formatos JSON**:
     - Array de strings/números: `["969681", "12345"]`
     - Array de objetos: `[{"id": 969681}, {"id_tmdb": 969681}, {"tmdb_id": 969681}]`
     - Objeto estructurado RedeFlix: `{ "items": [{ "id_tmdb": 969681, "episodios": { "1": { "1": "url" } } }] }`
     - Diccionario de IDs: `{ "969681": true, "12345": {...} }`
   - **Caché**: Mantiene el caché en memoria de 6 horas para no sobrecargar el servidor remoto.

### B. Interfaz de Administración (`app/admin/page.tsx`)
1. Renombrar y actualizar la sección del modal de edición de servidor a:
   **"Comprobación de Disponibilidad de Catálogo (Opcional)"**
   *(Soporta lista en lote TXT/JSON, API completa o link de comprobación puntual)*
2. Añadir explicaciones claras y ejemplos:
   - Ejemplos de links de comprobación: `https://v2.watchplay.shop/movie/{id}` y `https://v2.watchplay.shop/tvshow/{id}/{s}/{e}`
   - Auto-detección / normalización si el usuario pega un enlace con IDs de ejemplo como `https://v2.watchplay.shop/movie/969681`.
3. Herramienta interactiva **"Probar Disponibilidad"**:
   - Permite al administrador ingresar un ID de prueba (por defecto `969681` para película o `1396/1/1` para serie) y pulsar "Probar URL".
   - Muestra el resultado en tiempo real: `Disponible (200 OK)` o `No disponible (404 / No encontrado)`.

### C. Módulo Central (`lib/redeflix-availability.ts`)
- Mantener retrocompatibilidad total con funciones existentes: `isRedeflixProvider`, `isRedeflixAvailable`, `getRedeflixMovieSet`, `getRedeflixTvMap`.
- Implementar la función unificada de verificación `checkCatalogAvailability(opts)`:
  - Detecta si es Batch List o Probe URL.
  - Ejecuta la estrategia correspondiente con caché.
  - Fallback transparente: si ocurre un timeout o error de red en el probe puntual, se permite el servidor para no bloquear falsamente al usuario.

## 4. Criterios de Aceptación
1. Un servidor configurado con `https://v2.watchplay.shop/movie/{id}` o `https://v2.watchplay.shop/movie/969681` verifica películas mediante probe puntual: TMDB 969681 devuelve `true` (status 200), ID inexistente devuelve `false` (status 404).
2. Un servidor configurado con `https://v2.watchplay.shop/tvshow/{id}/{s}/{e}` o `https://v2.watchplay.shop/tvshow/1396/1/1` verifica series/episodios: TMDB 1396 T1E1 devuelve `true` (status 200), ID inexistente devuelve `false` (status 404).
3. Servidores con listas en lote existentes (ej. RedeFlix con `list-movie-ids.txt` y `list-tv-ids.txt`) siguen funcionando al 100% sin alteraciones.
4. Se admiten catálogos JSON en múltiples variantes (array de IDs, array de objetos con `id`/`id_tmdb`, y formato con `items`).
5. El panel de administración en `/admin` ofrece guía visual y soporte para probar URLs de comprobación directamente.
6. Toda la suite de tests y `npm run build` pasan al 100%.
