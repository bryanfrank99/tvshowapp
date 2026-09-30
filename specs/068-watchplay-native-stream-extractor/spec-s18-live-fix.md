# Spec 068‑S18‑Live‑Fix

## Contexto
- Provider ID 18 = WatchPlay (S18) → HLS (.m3u8) que requiere CORS anonymous.
- El reproductor debe tratarlo como *cached* HLS y evitar fallback a streams alternativos.

## Cambios requeridos
1. En `NativeSourcePlayer` establecer `video.crossOrigin = "anonymous"` cuando `isHlsStream` sea `true`.
2. En `app/api/resolve/route.ts` confirmar que el `Source` devuelto tiene:
   - `type: "hls"`
   - `priority: 120`
   - `url` = `cachedHls.hlsUrl`
3. No se añaden `candidateUrls` extra; solo la URL cacheada.
4. Si falla la reproducción, el botón **Reintentar** vuelve a intentar con `currentUrlIndex = 0`.

## Validación
- Test unitario que verifica `crossOrigin` y ausencia de `setError`.
- QA manual: reproducción de `http://localhost:3000/watch?type=tv&id=113962&s=1&e=1` debe iniciar sin mensaje de error.

## Notas de implementación
- El archivo se crea dentro de `specs/068-watchplay-native-stream-extractor/`.
- No es un artefacto; por lo tanto `ArtifactMetadata` no se incluye.
