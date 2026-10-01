# Spec 089: Proxy HLS/CORS para VIP Player (S20 PlayerFlix)

## Contexto
El servidor secundario extraído de PlayerFlix denominado "HLS - S20 (VIP Player (HLS))" no está cargando en el reproductor nativo. Tras la inspección técnica de red se determinó que:
1. El endpoint maestro de EmbedPlayer (`https://embedplayer2.xyz/cdn/hls/.../master.m3u8`) **no incluye cabeceras CORS** (`Access-Control-Allow-Origin`), por lo que el navegador/WebView bloquea la petición inmediatamente con un error de seguridad de origen cruzado.
2. Las sub-playlists contienen rutas relativas (`/hls/...`) y los segmentos de video (`https://plosia*.xyz/p/...woff/.js/.css`) responden con `HTTP 500 Internal Server Error` si no se envía la cabecera `Referer: https://embedplayer2.xyz/`.
3. Para que `NativeSourcePlayer` y `Hls.js` puedan reproducir este stream fMP4/MPEG-TS de forma nativa sin errores de CORS y con los referers requeridos, se necesita un endpoint proxy ligero y seguro (`/api/playerflix/proxy`) que reescriba los manifiestos e inyecte los encabezados adecuados con CORS abierto (`*`).

## Objetivos
- [ ] Implementar el endpoint proxy de transmisión `/api/playerflix/proxy/route.ts` con lista blanca de dominios permitidos (`embedplayer*.xyz`, `plosia*.xyz`).
- [ ] Reescribir las listas maestras y de variantes (`.m3u8`) redirigiendo los segmentos hacia el proxy con cabeceras `Access-Control-Allow-Origin: *` y `Referer: https://embedplayer2.xyz/`.
- [ ] Servir los segmentos de video con tipo de contenido `video/mp2t` y caché inmutable de corta/media duración.
- [ ] Actualizar `lib/playerflix.ts` para que los streams extraídos de EmbedPlayer/VIP Player utilicen la ruta del proxy HLS local en lugar de la URL cruda sin CORS.
- [ ] Mantener la URL del iframe de respaldo funcional para garantizar resiliencia.

## No objetivos
- No almacenar archivos de video en disco ni modificar el stream primario WatchPlay (que ya tiene CORS abierto por defecto).

## Criterios de aceptación
- [ ] `GET /api/playerflix/proxy?url=...` descarga y reescribe la lista `.m3u8` devolviendo código 200 y `Access-Control-Allow-Origin: *`.
- [ ] Los segmentos de video MPEG-TS son entregados exitosamente con `video/mp2t` y encabezados válidos.
- [ ] La fuente "HLS - S20 (VIP Player (HLS))" carga y reproduce video sin errores de CORS en el reproductor.
- [ ] Suite de pruebas actualizada y `npm run build` verde con 0 errores.

## Restricciones
- Constitución aplicable: 1, 2, 3, 6, 8.
- El proxy debe validar estrictamente que la URL pertenezca a la lista blanca de hosts autorizados para prevenir Open Redirect o SSRF.
