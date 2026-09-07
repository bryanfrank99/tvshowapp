# Tasks: rutas por query

- [ ] 1. Crear `app/title/page.tsx` (fusión movie+tv por `?type=&id=`) → verificar: compila
- [ ] 2. Crear `app/person/page.tsx` (`?name=`) y `app/genre/page.tsx` (`?id=&name=`) → verificar: compilan
- [ ] 3. Actualizar Links en Cards, FeaturedCarousel, ContinueWatching, MyList, page, list, search, watch → verificar: grep sin rutas viejas
- [ ] 4. Borrar `app/movie/[id]`, `app/tv/[id]`, `app/person/[name]`, `app/genre/[id]`
- [ ] 5. `npm run build` verde
- [ ] 6. Navegación home → detalle → volver en dev (curl 200)
