# Plan de Implementación: Spec 091 - Corregir Reproducción HLS de S20 (PlayerFlix)

## 1. Arquitectura y Enrutamiento del Proxy (`app/api/playerflix/proxy/route.ts`)
- Reemplazar la lista blanca rígida por un filtro que autorice cualquier dominio público con TLDs usados por PlayerFlix (`.xyz`, `.ink`, `.top`, `.quest`, `.site`, `.shop`, `.io`), excluyendo explícitamente hosts privados/locales (`localhost`, `127.0.0.1`, `10.*`, `192.168.*`, `172.16-31.*`, etc.) para prevenir vulnerabilidades SSRF.
- Implementar paso de cabecera `Range` upstream y propagación de `Content-Range`, `Accept-Ranges` y estado `206 Partial Content`.
- En el procesador de listas de reproducción M3U8, agregar reescritura de atributos `URI="..."` en directivas que comiencen con `#` (como `#EXT-X-KEY` y `#EXT-X-MAP`).
- Asegurar cabeceras CORS permisivas (`Access-Control-Allow-Origin: *`, `Access-Control-Expose-Headers: Content-Length, Content-Range, Accept-Ranges`).

## 2. Ajuste de Opciones y Servidores en `lib/playerflix.ts` y `app/api/resolve/route.ts`
- En `lib/playerflix.ts`:
  - Asegurar que `extractFromEmbedPlayer` identifique con precisión el stream HLS (`id: "embedplayer"`, `label: "VIP Player"`) y su versión web iframe (`id: "embedplayer-web"`, `label: "VIP Player (Web)"`).
  - Asignar identificadores consistentes con `-iframe` a las opciones web para evitar colisiones.
- En `app/api/resolve/route.ts`:
  - Cuando se procese PlayerFlix, generar IDs con prefijo descriptivo (`${prov.id}-iframe-${sIdx + 1}` o `${prov.id}-alt-${sIdx + 1}`).
  - Conservar tanto la fuente HLS principal (cuando esté disponible) como las fuentes iframe alternativas.
- En `app/watch/page.tsx`:
  - Modificar `mergeExtractedStreams` para que no descarte las fuentes alternativas de PlayerFlix con `type: "iframe"`.

## 3. Pruebas y Validación
- Actualizar `scripts/test-playerflix-extractor.mjs`:
  - Añadir prueba de descarga de fragmentos de video reales alojados en `eloialu*.xyz` a través de `/api/playerflix/proxy`.
  - Comprobar compatibilidad de Range y CORS.
- Ejecutar `npm run build` para asegurar integridad de TypeScript y empaquetado.
