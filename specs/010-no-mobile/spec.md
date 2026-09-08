# Spec: una sola vista estándar

## Contexto
Mantener dos vistas (móvil + estándar) duplica lógica. Se elimina la móvil:
todos usan la estándar (sidebar + topbar).

## Objetivos
- [ ] Fuera la bottom bar móvil y sus tabs.
- [ ] Sidebar visible siempre (no solo `lg`).
- [ ] Contenido con padding del sidebar en todos los anchos.
- [ ] Sin `lg:hidden`/`md:` que oculten navegación.

## No objetivos
- Quitar responsive de grids/cards (eso es estándar, se queda).

## Criterios de aceptación
- [ ] En 360px se ve sidebar + topbar, sin barra inferior.
- [ ] `npm run build` verde.

## Restricciones
- Constitución: 3, 6.
