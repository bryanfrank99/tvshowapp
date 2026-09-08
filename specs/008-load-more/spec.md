# Spec: listas con "Cargar más"

## Contexto
Las listas son finitas (12-24 items). Al final debe haber botón que cargue más.

## Objetivos
- [ ] Paginación real en catálogo (TMDB `page`, Cinemeta `skip=`).
- [ ] Componentes cliente `MoreRail`/`MoreGrid` con botón Cargar más.
- [ ] Aplicar en: home (featured, spotlight, picks, upcoming), movies, series, search, genre.
- [ ] Top 10 y person quedan fijos (sin sentido paginar).

## No objetivos
- Scroll infinito automático (botón explícito, mejor para TV).

## Criterios de aceptación
- [ ] Cada "Cargar más" agrega items nuevos sin duplicados ni perder el foco.
- [ ] Cuando no hay más, el botón desaparece.
- [ ] `npm run build` verde.

## Restricciones
- Constitución: 1 (3 idiomas), 3, 6 (foco estable al agregar).
