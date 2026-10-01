# Plan: Desactivar WatchPlay en S20 y Habilitar Proveedores Restantes (spec ../spec.md)

## Enfoque
1. **Modificar `lib/playerflix.ts`**:
   - En `fetchPlayerFlixStreams`: descartar cualquier opción cuya URL contenga `watchplay.shop`.
   - Si la opción es VIP Player (`embedplayer`), extraer su stream y enrutarlo por el proxy `/api/playerflix/proxy?url=...` como fuente HLS, y además registrar la URL original del iframe como opción alternativa.
   - Para las demás opciones (como `embedplayabyss.top` o `superflixapi.quest`), preservarlas como opciones tipo `iframe`.
   - Asignar como `primaryHlsUrl` el primer stream HLS que no sea WatchPlay (o dejarlo undefined si solo hay fuentes iframe).
2. **Modificar `app/watch/page.tsx`**:
   - Cambiar la tarea de extracción de `playerFlixItem` para que consulte `GET /api/playerflix?id=...&type=...` en lugar de importar `fetchPlayerFlixStreams` directamente en el navegador.
   - Si la respuesta trae streams HLS o iframes de S20, incorporarlos en la lista de fuentes activas.
3. **Modificar `app/api/resolve/route.ts`**:
   - Adaptar la resolución de S20 para que si no hay `hlsUrl` primario disponible (ej. si solo hay iframes de Embed Play), genere directamente las fuentes `iframe` para S20.
4. **Actualizar suite de pruebas `scripts/test-playerflix-extractor.mjs`**:
   - Verificar que no aparezca WatchPlay en los streams de S20.
   - Verificar que VIP Player HLS o Embed Play iframe se entreguen correctamente.
5. **Verificación con `npm run build`**.

## Archivos
| Archivo | Cambio |
| --- | --- |
| `lib/playerflix.ts` | Descartar opciones de `watchplay.shop` en S20 |
| `app/watch/page.tsx` | Consultar `/api/playerflix` para evitar CORS en cliente |
| `app/api/resolve/route.ts` | Soportar fallback a iframe en S20 si no hay HLS |
| `scripts/test-playerflix-extractor.mjs` | Actualizar pruebas para reflejar exclusión de WatchPlay |

## Decisiones
- **Exclusión total de WatchPlay en S20**: Evita duplicación con S18 y permite que el usuario pruebe exclusivamente los otros proveedores de PlayerFlix en S20.
- **Llamada de cliente vía `/api/playerflix`**: En Next.js App Router, componentes con `"use client"` deben consultar APIs locales en lugar de dominios externos protegidos por Cloudflare/CORS.

## Riesgos
- Si un título solo tenía WatchPlay en PlayerFlix, no tendrá stream HLS en S20.
  - *Mitigación*: Se generan las fuentes `iframe` de Embed Play o Premium para que el usuario pueda reproducir vía iframe.

## Verificación
- `node scripts/test-playerflix-extractor.mjs`
- `npm run build`
