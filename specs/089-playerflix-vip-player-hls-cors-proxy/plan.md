# Plan: Proxy HLS/CORS para VIP Player (spec ../spec.md)

## Enfoque
1. Crear el endpoint Next.js Route Handler `app/api/playerflix/proxy/route.ts`:
   - Valida el parámetro `url` contra dominios permitidos (`embedplayer2.xyz`, `embedplayer1.xyz`, `plosia*.xyz`, etc.).
   - Aplica cabeceras `Referer: https://embedplayer2.xyz/` y `User-Agent` de navegador.
   - Si el recurso es un manifiesto `.m3u8` o playlist:
     - Reescribe URLs relativas (`/hls/...`) y URLs absolutas (`https://plosia...`) para que pasen por el proxy `/api/playerflix/proxy?url=...`.
     - Devuelve `Content-Type: application/vnd.apple.mpegurl` y `Access-Control-Allow-Origin: *`.
   - Si el recurso es un segmento multimedia binario (`.js`, `.woff`, `.css`, `.ts` con bytes MPEG-TS 0x47):
     - Devuelve el stream/buffer con `Content-Type: video/mp2t` y `Access-Control-Allow-Origin: *`.
2. Actualizar `lib/playerflix.ts`:
   - En la función `extractFromEmbedPlayer`, envolver `hlsUrl` en `/api/playerflix/proxy?url=${encodeURIComponent(hlsUrl)}`.
   - Ajustar `backupUrls` correspondientemente.
3. Probar con script automatizado y ejecutar compilación `npm run build`.

## Archivos
| Archivo | Cambio |
| --- | --- |
| `app/api/playerflix/proxy/route.ts` | **Crear** — Proxy HLS/CORS con reescritura de manifiestos y streaming de chunks |
| `lib/playerflix.ts` | **Editar** — Enlazar URLs de VIP Player a través de la ruta del proxy |
| `scripts/test-playerflix-extractor.mjs` | **Editar** — Verificar que VIP Player HLS pasa por el proxy y responde 200 con CORS |

## Decisiones
- **Reescritura de playlists en el proxy**: Permite que `Hls.js` en el cliente descargue tanto el manifiesto maestro como las variantes y los segmentos `.js`/`.woff` sin toparse con restricciones de CORS ni errores 500 por falta de Referer.
- **Whitelist estricta de dominios**: Solo se autorizan dominios conocidos de EmbedPlayer y sus CDNs (`embedplayer*.xyz`, `plosia*.xyz`) para garantizar seguridad.

## Riesgos
- **Sobrecarga de segmentos**: Cada segmento es de ~60-100KB y se transmite con latencia mínima (<150ms).
  - *Mitigación*: Cabeceras de caché `Cache-Control: public, max-age=86400, immutable` para evitar peticiones repetidas.

## Verificación
- `node scripts/test-playerflix-extractor.mjs`
- `npm run build`
