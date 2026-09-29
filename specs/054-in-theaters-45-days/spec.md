# Spec 054: Ventana de 45 Días para la Etiqueta "EN CINES"

## 1. Contexto y Problema
En TVShow, las películas en cartelera muestran la insignia **"EN CINES"** (`theater_badge`: "En Cines" / "In Theaters" / "Nos Cinemas") tanto en los posters del catálogo ([`components/Cards.tsx`](file:///C:/Users/Administrator/.gemini/antigravity/scratch/tvshowapp/components/Cards.tsx)) como en la ficha técnica ([`app/title/page.tsx`](file:///C:/Users/Administrator/.gemini/antigravity/scratch/tvshowapp/app/title/page.tsx)) y en el reproductor ([`app/watch/page.tsx`](file:///C:/Users/Administrator/.gemini/antigravity/scratch/tvshowapp/app/watch/page.tsx)), acompañada del aviso informativo sobre calidad CAM.

Anteriormente, la lógica dependía de:
- Estar en el listado `now_playing` de TMDB (limitado a unas pocas decenas de títulos con sesgo geográfico).
- Consultas adicionales de tipos de lanzamiento en `release_dates` (digital tipo 4 / físico tipo 5).
- Una ventana amplia y variable de hasta 90 días.
- Si una película no venía explícitamente en el set `now_playing` o carecía de `release_dates` detalladas, la etiqueta no se mostraba a pesar de ser un estreno reciente.

## 2. Requerimiento del Negocio
Se establece una regla universal, predecible y determinista:
> **"La etiqueta 'EN CINES' debe aparecerle a todas las películas desde su fecha de estreno (día 0) y hasta 45 días después. En el día 46 ya no debe mostrarse esa etiqueta."**

## 3. Especificación Funcional

### A. Regla de Elegibilidad y Cálculo Temporal
1. **Tipo de Contenido**:
   - Aplica **únicamente a películas** (`type === "movie"`, `media_type !== "tv"`, sin temporadas).
   - Las series de televisión nunca llevan la etiqueta "EN CINES".
2. **Cálculo de Días Transcurridos (`daysSince`)**:
   - Se toma la fecha de estreno oficial (`release_date`, formato `YYYY-MM-DD`).
   - El cálculo se normaliza a medianoche UTC para evitar desfases por zona horaria:
     ```ts
     const [y, m, d] = releaseDateStr.slice(0, 10).split("-").map(Number);
     const releaseDate = new Date(Date.UTC(y, m - 1, d));
     const now = new Date();
     const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
     const daysSince = Math.floor((today.getTime() - releaseDate.getTime()) / (1000 * 60 * 60 * 24));
     ```
3. **Determinación de Estado**:
   - Si `daysSince < 0`: Película aún no estrenada (estreno futuro) → **NO muestra etiqueta**.
   - Si `0 <= daysSince <= 45`: La película está en su ventana de cines (día del estreno hasta el día 45 inclusive) → **MUESTRA ETIQUETA "EN CINES"**.
   - Si `daysSince >= 46`: Han transcurrido 46 días o más → **NO muestra etiqueta**.
   - Si no dispone de `release_date` válida → **NO muestra etiqueta**.

### B. Puntos de Impacto en la Aplicación
1. **[`lib/theaters.ts`](file:///C:/Users/Administrator/.gemini/antigravity/scratch/tvshowapp/lib/theaters.ts)**:
   - Refactorizar `isMovieInTheaters(m)` para aplicar la regla universal de los 45 días basada en `release_date`.
   - Exportar helper `getDaysSinceRelease(dateStr)` para reutilización y pruebas.
2. **[`lib/catalog.ts`](file:///C:/Users/Administrator/.gemini/antigravity/scratch/tvshowapp/lib/catalog.ts)**:
   - Actualizar `tagInTheaters(items)` para que cualquier película dentro del rango 0–45 días reciba `in_theaters: true`.
3. **[`lib/theaters-server.ts`](file:///C:/Users/Administrator/.gemini/antigravity/scratch/tvshowapp/lib/theaters-server.ts)**:
   - Sincronizar el filtro de `now_playing` del servidor para respetar el límite de 45 días (cambiar ventana anterior de 90d a 45d).
4. **UI ([`components/Cards.tsx`](file:///C:/Users/Administrator/.gemini/antigravity/scratch/tvshowapp/components/Cards.tsx), [`app/title/page.tsx`](file:///C:/Users/Administrator/.gemini/antigravity/scratch/tvshowapp/app/title/page.tsx), [`app/watch/page.tsx`](file:///C:/Users/Administrator/.gemini/antigravity/scratch/tvshowapp/app/watch/page.tsx))**:
   - Continúan consumiendo `isMovieInTheaters(m)` de forma transparente, reflejando de inmediato la nueva regla en todas las vistas (catálogo, ficha y reproductor).

## 4. Criterios de Aceptación
1. Una película estrenada hoy (`daysSince = 0`) muestra la etiqueta "EN CINES".
2. Una película estrenada hace 20 días (`daysSince = 20`) muestra la etiqueta "EN CINES".
3. Una película estrenada hace exactamente 45 días (`daysSince = 45`) muestra la etiqueta "EN CINES".
4. Una película estrenada hace 46 días (`daysSince = 46`) **NO** muestra la etiqueta "EN CINES".
5. Una película con estreno futuro (`daysSince < 0`) **NO** muestra la etiqueta "EN CINES".
6. Una serie de TV nunca muestra la etiqueta "EN CINES", sin importar su fecha.
7. Todas las pruebas pasan satisfactoriamente.
