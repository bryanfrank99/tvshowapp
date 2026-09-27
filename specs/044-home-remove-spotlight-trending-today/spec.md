# Spec: Eliminación de "Episode Spotlight" y Transformación a "Tendencias de Hoy"

## 1. Contexto y Requerimiento
El usuario solicitó simplificar y potenciar la pantalla de inicio (`app/page.tsx`):
1. **Eliminar "Episode Spotlight"**: No aporta valor a los usuarios (mostrar episodios aislados no encaja en una plataforma de streaming) y sobrecarga las llamadas a la API.
2. **Transformar "Top picks" en "Tendencias de Hoy"**: Renombrar la sección destacada a "Tendencias de Hoy", alimentada con las obras más vistas del día (`/trending/all/day`).
3. **Mantener intacto el aspecto visual**: Conservar exactamente el mismo diseño, carriles horizontales (`rail`), tarjetas (`MediaCard`), iconos y estructura de las secciones restantes ("Destacado hoy", "En cines", "Top 10").

---

## 2. Cambios Funcionales y Técnicos

1. **Diccionario (`lib/dict.ts`):**
   - Actualizar `toppicks` en español a `"Tendencias de hoy"`.
   - En inglés: `"Trending today"`.
   - En portugués: `"Tendências de hoje"`.
2. **Catálogo (`lib/catalog.ts`):**
   - Implementar `getTrendingToday(page, per)` consumiendo `/trending/all/day` con fallback a catálogo de novedades, etiquetado de cartelera (`tagInTheaters`) y filtrado estricto de fechas de estreno (`isPremiered`).
3. **Página de Inicio (`app/page.tsx`):**
   - Remover importación y llamada a `getEpisodeSpotlight`.
   - Remover renderizado de la sección de `spotlight` y componente `SpotCard`.
   - Alimentar la sección del fuego (`IconFire`) con `getTrendingToday(1, 12)` mostrando el título actualizado `d.toppicks` ("Tendencias de hoy").
   - Preservar `FeaturedCarousel`, `upcoming` ("En cines") y `top10` ("Top 10").

---

## 3. Criterios de Aceptación
- La sección "Episode Spotlight" no aparece en la pantalla de inicio.
- La sección que antes se llamaba "Top picks" ahora tiene el título "Tendencias de hoy" (o su traducción según idioma).
- El aspecto visual (carril horizontal de tarjetas `MediaCard`, icono de fuego naranja) se mantiene exactamente igual.
- Las demás secciones ("Destacado hoy", "En cines", "Top 10") permanecen inalteradas.
- Compilación de producción exitosa con `npm run build`.
