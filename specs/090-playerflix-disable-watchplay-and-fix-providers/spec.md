# Spec 090: Desactivar WatchPlay en S20 y Habilitar Proveedores Restantes de PlayerFlix

## Contexto
El usuario ha solicitado expresamente:
1. **Desactivar WatchPlay en el servidor S20 (PlayerFlix)**, debido a que WatchPlay ya se encuentra activo en el servidor S18 y actualmente S20 estaba seleccionando WatchPlay como su stream primario, duplicando funcionalidad.
2. **Evaluar y hacer funcionar los proveedores restantes devueltos por PlayerFlix** (VIP Player / EmbedPlayer, Embed Play, etc.), asegurando que cuando el usuario reproduzca en S20, se carguen exclusivamente las opciones secundarias sin depender de WatchPlay.
3. Corregir la llamada de extracción en `app/watch/page.tsx` para que consulte el endpoint interno `/api/playerflix` en lugar de invocar `playerflix.ink` directamente desde el navegador del cliente (evitando errores de CORS en el frontend).

## Objetivos
- [ ] Excluir `watchplay.shop` del procesamiento de opciones en `lib/playerflix.ts` para que S20 no ofrezca ni resuelva WatchPlay.
- [ ] Promover como stream HLS primario de S20 a VIP Player (vía proxy HLS `/api/playerflix/proxy`) y asegurar la disponibilidad de fuentes iframe para Embed Play y otras opciones devueltas.
- [ ] Ajustar `app/watch/page.tsx` para que la tarea de extracción consulte `/api/playerflix` (evitando bloqueos de CORS en el navegador).
- [ ] Limpiar la caché de stream en base de datos para S20 para que no conserve URLs previas de WatchPlay.
- [ ] Validar con suite de pruebas `scripts/test-playerflix-extractor.mjs` y `npm run build`.

## No objetivos
- No eliminar el servidor S18 (WatchPlay independiente).
- No afectar a otros servidores como Cinecalidad (S19) o NasriPlay (S17).

## Criterios de aceptación
- [ ] `fetchPlayerFlixStreams` no incluye ninguna fuente de `watchplay.shop` en su listado de streams.
- [ ] Para películas con VIP Player (ej: 969681), el stream primario de S20 es VIP Player enrutado mediante `/api/playerflix/proxy`.
- [ ] Para películas o series sin VIP Player pero con Embed Play u otras opciones, se generan fuentes iframe funcionales sin WatchPlay.
- [ ] `app/watch/page.tsx` consulta `/api/playerflix` sin errores de CORS en el navegador.
- [ ] `npm run build` compila con éxito (0 errores).

## Restricciones
- Constitución aplicable: 1, 2, 3, 6, 8.
