# Spec 092: Activar WatchPlay en S20 y Filtrar Exclusivamente Servidores HLS (Sin Embeds)

## Contexto
El usuario ha confirmado el correcto funcionamiento de S20 con la corrección del proxy para CDNs dinámicos de VIP Player (Spec 091), y solicita:
1. **Reactivar WatchPlay en el servidor S20 (PlayerFlix)** para aprovechar los streams HLS nativos de WatchPlay.
2. **Excluir completamente todos los servidores tipo embed/iframe de S20**:
   - No mostrar opciones de terceros basadas en iframes (Embed Play, Premium, versión web de VIP Player).
   - S20 debe entregar **única y exclusivamente streams directos HLS** (`type === "hls"`), tales como WatchPlay (HLS) y VIP Player (HLS vía proxy CORS).

## Objetivos
- [ ] Reactivar la extracción de stream directo HLS fMP4 desde `watchplay.shop` en `lib/playerflix.ts`.
- [ ] Omitir de forma estricta cualquier opción de tipo iframe o embed en `lib/playerflix.ts` y `app/api/resolve/route.ts` para S20.
- [ ] Asegurar que si tanto WatchPlay como VIP Player están disponibles, se entreguen como fuentes HLS nativas independientes (`HLS - S20 (WatchPlay)` y `HLS - S20 (VIP Player)`).
- [ ] Evitar que si un título no tiene streams HLS disponibles en PlayerFlix, se genere un fallback a iframe genérico.
- [ ] Actualizar la suite de pruebas `scripts/test-playerflix-extractor.mjs` para verificar la reactivación de WatchPlay y la ausencia total de opciones iframe en S20.
- [ ] Verificar compilación exitosa con `npm run build`.

## No objetivos
- No eliminar el servidor S18 (WatchPlay independiente continúa funcionando para sus respectivos ordenamientos).
- No afectar a otros servidores (S14, S17, S19).

## Criterios de aceptación
- [ ] `fetchPlayerFlixStreams` incluye los streams HLS de WatchPlay y VIP Player cuando están disponibles.
- [ ] Ningún objeto stream devuelto por `fetchPlayerFlixStreams` o `app/api/resolve/route.ts` para S20 tiene `type === "iframe"`.
- [ ] Para películas con WatchPlay y VIP Player (ej. 969681), S20 entrega exclusivamente servidores HLS nativos.
- [ ] Para títulos sin streams HLS en PlayerFlix, no se generan tarjetas de servidor embed para S20.
- [ ] La suite `scripts/test-playerflix-extractor.mjs` supera el 100% de las pruebas.
- [ ] `npm run build` compila con 0 errores.
