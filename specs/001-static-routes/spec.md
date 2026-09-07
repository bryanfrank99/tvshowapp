# Spec: rutas por query para export estático

## Contexto
Con `output: export` (Capacitor) las rutas dinámicas (`/movie/[id]`) no resuelven
sin servidor. Hay que migrarlas a rutas estáticas con query params.

## Objetivos
- [ ] Eliminar todos los segmentos dinámicos `[id]`/`[name]`.
- [ ] Misma UX: detalle peli/serie, persona, género accesibles por link.
- [ ] El build web normal (`npm run build`) sigue verde.

## No objetivos
- Convertir páginas a cliente (eso es specs/002).
- Capacitor en sí.

## Criterios de aceptación
- [ ] No queda ningún directorio `[` en `app/`.
- [ ] `npm run build` verde.
- [ ] Navegar home → detalle → volver funciona en dev.

## Restricciones
- Constitución: 3 (build verde).
- Actualizar TODOS los Links internos (cards, hero, buscador, favs, historial, live).
