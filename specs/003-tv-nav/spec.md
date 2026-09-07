# Spec: navegación TV con navbar izquierda

## Contexto
En Android TV la navegación con mando es mala: sin landmarks claros, foco
poco visible y sin memoria de foco entre páginas.

## Objetivos
- [ ] Navbar izquierda fija (iconos + etiquetas al enfocar) en pantallas grandes.
- [ ] Navegación espacial con flechas: izq/der dentro de rails, arriba/abajo entre filas.
- [ ] Foco siempre visible (anillo + escala) y con scroll automático.
- [ ] Memoria de foco por ruta (volver = mismo sitio).
- [ ] Tecla Atrás del mando = volver (ya existe, conservar).

## No objetivos
- Rediseño mobile (bottom bar intacta).
- Numpad, botones de colores, voz.

## Criterios de aceptación
- [ ] Solo teclado: se llega a cualquier tarjeta, player y menú.
- [ ] El foco nunca queda fuera de pantalla ni invisible.
- [ ] `npm run build` verde.

## Restricciones
- Constitución: 3 (build), 6 (mando TV).
