# Spec: fixes app TV

## Contexto
1. El zoom base 112-120% se ve gigante en TV: revertir a estándares.
2. En TV el foco cae en corazones y no entra al contenido: ocultar favs de
   cards en modo TV (siguen en detalle y con mouse/tap).
3. Servidores poco manejables con mando necesitan salida: botón "Abrir externo"
   (navegador externo vía Intent) salvo flag `tvOk: true` en el JSON.

## Objetivos
- [ ] Sin `font-size` global distinto de 100%.
- [ ] En TV (`useIsTV`), cards sin corazón → un solo foco por card.
- [ ] Botón "Abrir externo" en watch salvo `tvOk` del proveedor.

## No objetivos
- Cambiar desktop/móvil más allá del zoom.

## Criterios de aceptación
- [ ] Solo-mando: del rail se entra al detalle sin atascos.
- [ ] `tvOk: true` en JSON oculta el botón para ese servidor.
- [ ] `npm run build` verde.

## Restricciones
- Constitución: 1, 3, 6.
