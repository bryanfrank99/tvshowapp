# Spec: Sustitución por "Películas Populares" y "Series Populares" en la Portada

## 1. Contexto y Requerimiento
El usuario solicitó reorganizar las secciones de contenido de la página de inicio (`app/page.tsx`):
1. **Reemplazar "Tendencias de Hoy" por "Películas Populares"**:
   - Conectar directamente los contenidos populares de TMDB correspondientes a `https://www.themoviedb.org/movie` (`getMovies(1, 12)`).
2. **Reemplazar "En cines" por "Series Populares"**:
   - Conectar directamente las series populares de TMDB correspondientes a `https://www.themoviedb.org/tv` (`getSeries(1, 12)`).
3. **Mantener el aspecto visual de lo modificado**:
   - Preservar exactamente el mismo formato de carril (`rail`), tarjetas (`MediaCard`), y estructura de componentes sin alterar el resto de la página ("Destacado hoy" y "Top 10").

---

## 2. Puntos de Impacto

1. **Diccionario (`lib/dict.ts`):**
   - Incorporar o actualizar las etiquetas correspondientes:
     - `popular_movies`: "Películas populares" (es), "Popular movies" (en), "Filmes populares" (pt).
     - `popular_series`: "Series populares" (es), "Popular series" (en), "Séries populares" (pt).
2. **Página de Inicio (`app/page.tsx`):**
   - Sustituir `getTrendingToday` por `getMovies(1, 12)`.
   - Sustituir `getUpcoming` por `getSeries(1, 12)`.
   - Renderizar la sección 2 con el título `d.popular_movies` e icono `IconFilm`.
   - Renderizar la sección 3 con el título `d.popular_series` e icono `IconTv`.
   - Conservar `FeaturedCarousel` y `top10` ("Top 10").

---

## 3. Criterios de Aceptación
- La portada muestra la sección "Películas populares" alimentada por `getMovies(1, 12)` (ordenadas por popularidad en TMDB).
- La portada muestra la sección "Series populares" alimentada por `getSeries(1, 12)` (ordenadas por popularidad en TMDB).
- "Tendencias de hoy" y "En cines" quedan sustituidas por estas nuevas secciones con idéntico diseño visual de carril de tarjetas.
- Todas las suites de pruebas y `npm run build` pasan sin errores.
