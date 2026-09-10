# Spec: Top 10 igual que web en TV

## Contexto
En TV "Top 10 on IMDb this week" se ve desproporcionado (3 cols, cards enormes, números 5/6 cortados) vs web (2 cols balanceado). El usuario aportó captura TV donde se ve el bug. Los grids de Películas/Series sí deben seguir compactos en TV, pero Top 10 no.

## Objetivos
- [ ] Top 10 en `body.tv` idéntico a web estándar: 2 cols en `md`, gap/padding/typo iguales, números visibles.
- [ ] No afectarUpcoming/Películas/Series/Mi lista (siguen 6/8 cols en TV).
- [ ] Sin regresión en móvil/web.

## No objetivos
- Cambiar rails, hero o densidad 54%.

## Criterios de aceptación
- [ ] TV: Top 10 muestra 2 por fila como web, números 1-10 sin corte, mismo tamaño de card que web.
- [ ] Móvil/web/top10 sin cambios.
- [ ] `npm run build` verde.

## Restricciones
- Constitución: solo CSS bajo `body.tv`, aislar Top 10 con clase específica.
