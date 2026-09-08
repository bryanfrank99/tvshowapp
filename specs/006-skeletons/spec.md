# Spec: skeletons de carga

## Contexto
Al cargar datos se ve texto plano ("…", "Cargando…") o vacío. Skeletons con
shimmer dan sensación de velocidad y layout estable.

## Objetivos
- [ ] `components/Skeleton.tsx` con primitivas (card, hero, rail, grid, texto).
- [ ] `app/loading.tsx` + loadings por ruta servidor (title, person, genre, movies, series).
- [ ] Skeletons en páginas cliente (search, live, list, watch).
- [ ] Sin saltos de layout (mismas medidas que el contenido real).

## No objetivos
- Cambiar diseño final, solo estados de carga.

## Criterios de aceptación
- [ ] Throttle de red: se ven skeletons antes que contenido en cada ruta.
- [ ] `npm run build` verde.

## Restricciones
- Constitución: 1 (sin textos hardcodeados nuevos), 3, 6 (foco no atrapado).
