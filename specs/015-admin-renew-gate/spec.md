# Spec: admin renovar + gate rate-limit + watch sin carga infinita

## Contexto
- Admin necesita renovar códigos (extender expiración) y UI más clara.
- Gate ya tiene rate-limit (5/min) pero el mensaje no siempre se ve.
- Watch se queda cargando infinito cuando el código expira/borra: usa caché
  vieja (1h) y no muestra el gate; embed-url 401 tampoco se maneja.

## Objetivos
- [ ] Botón Renovar en cada código (extiende 30 días y muestra nuevo código si se regenera, o solo nueva fecha)
- [ ] Watch detecta 401 tanto en catálogo como en embed-url y muestra AccessGate + limpia caché
- [ ] Catálogo no sirve caché obsoleta cuando la sesión expiró (fetch primero, fallback solo por red)
- [ ] Admin UI pulida (estados vacíos, badges expiración)

## No objetivos
- Roles ni expiración por uso

## Criterios de aceptación
- [ ] Crear código → usar en watch → borrar/revocar en admin → recargar watch muestra gate, no spinner
- [ ] Renovar muestra nueva fecha y, si regenera, nuevo código una vez
- [ ] 6 intentos rápidos en gate → mensaje rate-limit
- [ ] `npm run build` verde

## Restricciones
- Constitución: 1, 2, 3
