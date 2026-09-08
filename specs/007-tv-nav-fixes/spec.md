# Spec: fixes navegación TV/móvil

## Contexto
1. En TV, el OK sobre una card no entra: corazón anidado dentro del link crea
   doble foco y el mando no resuelve.
2. El teclado de `/search` no es navegable en móvil (filas sin rail).
3. Los dots del carrusel atrapan el foco e impiden bajar (peor en móvil).

## Objetivos
- [ ] Corazón de cards no enfocable (solo clic/tap); fav sigue en detalle.
- [ ] Filas del teclado con navegación por flechas.
- [ ] Dots sin foco de teclado (tap sigue funcionando).

## No objetivos
- Cambiar diseño ni comportamiento de mouse/táctil.

## Criterios de aceptación
- [ ] Con Tab/flechas: foco único por card y OK entra al detalle.
- [ ] Flechas recorren teclado y resultados en `/search` móvil.
- [ ] Desde el hero se baja con ↓ sin atascarse.
- [ ] `npm run build` verde.

## Restricciones
- Constitución: 1, 3, 6.
