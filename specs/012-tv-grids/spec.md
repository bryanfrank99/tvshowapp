# Spec: densidad TV para parrillas y Top 10

## Contexto
En Android TV las cards de Películas/Series/Mi lista y Top 10 siguen grandes. 
En web ya están bien; el ajuste anterior solo tocó rails.

## Objetivos
- [ ] Películas/Series/Mi lista/búsqueda en TV: 7 columnas en lg, 5 en sm, gap 0.4rem, cards más compactas.
- [ ] Top 10 en TV: cards más bajas, imagen 48px, padding reducido, gap 0.4rem.
- [ ] Solo afecta a TV (body.tv), web intacta.

## No objetivos
- Cambiar hero/rail ya ajustados.

## Criterios de aceptación
- [ ] TV: Películas muestra 7 por fila en 1080p, cards ~30% más pequeñas.
- [ ] TV: Top 10 ocupa ~60% de altura anterior.
- [ ] Web: sin cambios.

## Restricciones
- Constitución: 3, 6. Solo CSS bajo body.tv.
