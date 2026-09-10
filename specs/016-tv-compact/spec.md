# Spec: Cards compactas solo en Android TV

## Contexto
En TV las cards de Películas/Series/Mi lista y Top 10 siguen grandes. Rails ya se achicó, pero grids y Top 10 no. Además la densidad 62% aún es alta para 10-foot.

## Objetivos
- [ ] Grids de Películas/Series/Mi lista/búsqueda: en `body.tv` 7 cols en lg (vs 6 web) + gap 0.4rem, cards más chicas sin tocar web.
- [ ] Top 10: en TV más compacto (padding, imagen y gap reducidos) manteniendo 2 cols.
- [ ] Densidad TV a 55% (vs 62% actual) solo en `body.tv`.
- [ ] Sin regresión en web (verificar que `html:has(body.tv)` no aplique sin clase).

## No objetivos
- Cambiar diseño de rails (ya ok) ni hero.

## Criterios de aceptación
- [ ] Captura TV: Películas muestra 7 por fila, Top 10 cabe 2-3 filas sin scroll excesivo.
- [ ] Web a 100% sin cambios.
- [ ] `npm run build` verde.

## Restricciones
- Constitución: 3, 6. Solo CSS/conditional bajo `body.tv`.
