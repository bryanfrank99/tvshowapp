# Spec 063: Comprobación de Disponibilidad de Catálogo para MegaEmbed (mgeb.top)

## 1. Contexto y Justificación
El proveedor **MegaEmbed (S14 / `mgeb.top`)** expone dos endpoints de catálogo en lote en formato JSON que contienen la lista completa de identificadores TMDB disponibles:
- **Películas:** `https://mgeb.top/api/movie`
  - Devuelve un arreglo JSON con ~17,700+ IDs numéricos de TMDB: `[ 171587, 266294, 930366, 693134, ... ]`.
- **Series:** `https://mgeb.top/api/series`
  - Devuelve un arreglo JSON con miles de IDs numéricos de series en TMDB: `[ 61585, 288385, 290720, 100088, ... ]`.

Actualmente:
1. `getRedeflixMovieSet` soporta arreglos numéricos planos en películas (`typeof item === "number"`).
2. Sin embargo, `getRedeflixTvMap` en [`lib/redeflix-availability.ts`](file:///C:/Users/Administrator/.gemini/antigravity/scratch/tvshowapp/lib/redeflix-availability.ts) espera que cada elemento del arreglo de series sea un objeto con la propiedad `episodios` o `episodes`. Al recibir números planos `[ 61585, ... ]`, los ignora y el mapa queda en tamaño 0 (`size: 0`).
3. Además, en la base de datos de Supabase, el proveedor `megaembed` (S14) no tiene configuradas las columnas `movie_list_url` ni `tv_list_url`, y `needs_tmdb` estaba en `false`, lo que impedía que el resolver cruzara IDs de IMDb con los IDs numéricos de TMDB expuestos por la API de `mgeb.top`.

Se requiere adaptar el sistema de disponibilidad de catálogo mediante SDD para que reconozca los catálogos planos de series y películas de `mgeb.top`, integrándolo tanto en el resolver de reproducción como en las pruebas del panel de administración.

---

## 2. Requerimientos del Sistema

### R1. Soporte de Arreglos Planos de Series en `getRedeflixTvMap`
- En [`lib/redeflix-availability.ts`](file:///C:/Users/Administrator/.gemini/antigravity/scratch/tvshowapp/lib/redeflix-availability.ts):
  - Al iterar los elementos del catálogo de series:
    - Si el elemento es un número o cadena numérica (ej. `61585`):
      - Tratarlo como un ID de serie TMDB válido.
      - Almacenar la serie en `tvMap` con un mapa comodín: `{ "*": { "*": "1" } }`.
      - Indicar que toda la serie está disponible en el catálogo del proveedor.

### R2. Validación de Comodín en `isRedeflixAvailable`
- En la función `isRedeflixAvailable`:
  - Al consultar si un episodio específico (ej. Temporada 1, Episodio 1) está disponible:
    - Si la serie existe en `tvMap` y contiene el comodín `series["*"]`, retornar `true` inmediatamente sin requerir desglose de episodios individuales.

### R3. Actualización de Configuración del Proveedor S14 en Base de Datos y Semilla
- En `supabase/seed.sql` y en la base de datos Supabase:
  - Actualizar el proveedor `megaembed` (S14):
    - `movie_list_url`: `https://mgeb.top/api/movie`
    - `tv_list_url`: `https://mgeb.top/api/series`
    - `needs_tmdb`: `true` (para asegurar que las búsquedas por IMDb se resuelvan al ID TMDB antes de contrastar el catálogo).
    - `movie_tpl`: `https://mgeb.top/embed/{id}`
    - `tv_tpl`: `https://mgeb.top/embed/{id}/{s}/{e}`

### R4. Soporte en el Panel de Administración (Comprobación y Tests Duales)
- Verificar que el endpoint `/api/admin/providers/health-check` y los botones de test del panel admin prueben correctamente `https://mgeb.top/api/movie` y `https://mgeb.top/api/series`.
- Validar tanto casos existentes (ej. Duna 2 `693134`, The Last of Us `100088`) como casos no existentes (ej. `999999999`).

### R5. Pruebas Automatizadas y Regresión
- Crear script `scripts/test-mgeb-availability.mjs` que verifique:
  1. Descarga y parsing de `https://mgeb.top/api/movie` (>10,000 películas detectadas).
  2. Descarga y parsing de `https://mgeb.top/api/series` (>1,000 series detectadas).
  3. Consulta de película existente por TMDB ID y por IMDb ID.
  4. Consulta de episodio de serie existente por TMDB ID y por IMDb ID.
  5. Consulta de ID inexistente confirmando que devuelve `false`.
- Ejecución de `npm run build` para asegurar compatibilidad total de tipos.
