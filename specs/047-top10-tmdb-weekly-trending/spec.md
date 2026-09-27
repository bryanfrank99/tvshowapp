# Spec: Actualización a "Tendencia semanal de TMDB" y Ránking Semanal Oficial

## 1. Contexto y Requerimiento
El usuario solicitó actualizar la sección que hasta ahora se titulaba "Top 10 on IMDb this week":
1. **Cambio de Nombre:** Actualizar el nombre a **"Tendencia semanal de TMDB"** (y sus traducciones correspondientes en inglés y portugués).
2. **Cambio de Títulos/Ránking:** En lugar de reordenar por puntuación (`vote_average`), mostrar directamente los títulos que lideran la **tendencia semanal oficial de TMDB** (`/trending/all/week`) en su orden nativo de popularidad (puestos 1 al 10 de TMDB).
3. **Preservar el Aspecto Visual:** Mantener la tarjeta `Top10Card`, su cuadrícula de 2 columnas, numeración dorada, póster y diseño general.

---

## 2. Puntos de Impacto

1. **Diccionario (`lib/dict.ts`):**
   - Actualizar la clave `top10`:
     - `es`: `"Tendencia semanal de TMDB"`
     - `en`: `"TMDB Weekly Trending"`
     - `pt`: `"Tendência semanal do TMDB"`
2. **Catálogo (`lib/catalog.ts`):**
   - Actualizar la función `getTop10ImdbWeek` / `getTop10TmdbWeek`:
     - Consumir `/trending/all/week` de TMDB respetando el orden natural de tendencia semanal (eliminando el reordenamiento por `vote_average` que alteraba la lista de TMDB).
     - Filtrar que tengan título y estén estrenados (`isPremiered`).
     - Tomar los primeros 10 en su orden nativo de tendencia (`rank: 1..10`).
3. **Página de Inicio (`app/page.tsx`):**
   - Mostrar la sección con `d.top10` ("Tendencia semanal de TMDB").

---

## 3. Criterios de Aceptación
- La sección de la página de inicio se titula "Tendencia semanal de TMDB".
- Los títulos mostrados corresponden a la lista semanal oficial de tendencias de TMDB en su orden nativo.
- El diseño visual de `Top10Card` (numeración 1 a 10 con reborde dorado, pósters, sinopsis) permanece idéntico.
- Las pruebas automatizadas y `npm run build` pasan al 100%.
