# Plan de Implementación - Spec 100

## 1. Actualización en `lib/hls-engine.ts`
- **Cabeceras por defecto:** Actualizar el diccionario base de cabeceras en `executeStep` (`action === "http_request"`) con las cabeceras completas de Chrome desktop para evitar detecciones de bot por firmas truncadas.
- **Manejo de HTTP 403 / Cloudflare Challenge:**
  - Si una petición HTTP responde con status 403 (o el texto contiene "cloudflare" o "challenge-platform"):
    - Si el paso define `allow_embed_fallback: true` o es `embed_page`, capturar el 403 y registrar en el contexto:
      - `ctx.embed_fallback_url = finalUrl`
      - `ctx.waf_blocked = true`
    - No romper abruptamente si hay una salida de fallback configurada.
  - En `runHlsExtractor`: Si el pipeline termina sin `hlsUrl` pero con `ctx.embed_fallback_url` o `ctx.waf_blocked`, generar un resultado con `embeds: [{ name: "MegaEmbed (Web Player)", url: ctx.embed_fallback_url, ... }]` y una advertencia descriptiva, retornando `success: true` (o estado con embed operable).
- **Preset de MegaEmbed:**
  - Actualizar `EXTRACTOR_PRESETS.megaembed` con cabeceras completas y `allow_embed_fallback: true`.

## 2. Ajustes en `app/api/resolve/route.ts`
- Asegurar que cuando `runHlsExtractor` retorne `embeds` o cuando ocurra un bloqueo 403, S14 siempre emita la fuente iframe embed (`https://mgeb.top/embed/{id}`) para que el cliente web/app no se quede en blanco.

## 3. Resolución Asistida en `app/admin/page.tsx`
- En `runExtractorTest`:
  - Si la llamada al backend devuelve un error conteniendo `HTTP 403` o indicando bloqueo de Cloudflare en el servidor:
    - Ejecutar automáticamente un test asistido desde el navegador del cliente (`fetch(url)` directo).
    - Dado que `mgeb.top` expone `Access-Control-Allow-Origin: *`, el navegador puede consultar el embed, parsear `var sources = [...]` y obtener los streams reales.
    - Mostrar el resultado exitoso con el distintivo: `✓ Resolución Asistida por Cliente (Bypass WAF en Navegador)`.

## 4. Verificación y Certificación
- Probar la ejecución con `npx tsx` simulando diferentes respuestas.
- Ejecutar `npm run build` para garantizar cero regresiones.
