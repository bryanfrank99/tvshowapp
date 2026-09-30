# Tasks 063: Comprobación de Disponibilidad de Catálogo para MegaEmbed (mgeb.top)

- [x] Task 1: Actualizar `getRedeflixTvMap` en `lib/redeflix-availability.ts` para soportar catálogos planos de series numéricos (`[ 61585, ... ]`) <!-- id: 063-task-1 -->
- [x] Task 2: Actualizar `isRedeflixAvailable` para aceptar comodín `*` en series que no desglosan episodios individuales <!-- id: 063-task-2 -->
- [x] Task 3: Actualizar el proveedor `megaembed` en Supabase y en `supabase/seed.sql` con las URLs `movie_list_url` y `tv_list_url` y `needs_tmdb = true` <!-- id: 063-task-3 -->
- [x] Task 4: Crear script automatizado de pruebas `scripts/test-mgeb-availability.mjs` y verificar disponibilidad de películas y series <!-- id: 063-task-4 -->
- [x] Task 5: Ejecutar `npm run build` y suite de verificación <!-- id: 063-task-5 -->
