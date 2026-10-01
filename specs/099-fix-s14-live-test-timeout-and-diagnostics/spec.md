# Spec 099: Corrección de Error en Test en Vivo de Extractor para S14 (MegaEmbed) y Diagnóstico Preciso en Admin

## 1. Contexto y Causa Raíz
Al pulsar **"Probar Extractor"** en el panel de Administración para S14 (MegaEmbed), se producía un fallo con el mensaje genérico `"✕ Fallo al Extraer"`.

### Hallazgos del Diagnóstico:
1. **Margen de Timeout Insuficiente en `mgeb.top`:**
   - La respuesta del servidor LiteSpeed/Cloudflare de `mgeb.top` bajo rate-limiting toma entre **13,000ms y 15,100ms**.
   - El paso `embed_page` en el preset de MegaEmbed tenía configurado `timeout_ms: 15000`. Al tardar 15,009ms, abortaba por 9ms de diferencia con `Error en paso [embed_page]: This operation was aborted`.
2. **Desajuste de Nombres de Parámetros en `/api/admin/providers`:**
   - `app/admin/page.tsx` enviaba `movie_api_url` y `tv_api_url` en el cuerpo del request, pero la ruta `/api/admin/providers/route.ts` leía `b.movie_tpl` y `b.tv_tpl`.
3. **Pérdida de Traza de Error en `app/admin/page.tsx`:**
   - Cuando el extractor fallaba (`ok: false`), el frontend descartaba `data.result` y asignaba un mensaje genérico `"Error al ejecutar el extractor"` con `durationMs: 0`, ocultando la traza de pasos (`stepTraces`) y el error real al usuario.
4. **Timeout de Seguridad en `/api/resolve`:**
   - `app/api/resolve/route.ts` tenía un `Promise.race` con timeout de 14,000ms que también cortaba a MegaEmbed en peticiones frías.

## 2. Solución
1. Ampliar `timeout_ms` del paso `embed_page` de MegaEmbed a **25,000ms** (25s) y agregar cabeceras `Referer: https://mgeb.top/` y `Accept`.
2. Compatibilizar parámetros en `/api/admin/providers/route.ts`: `movieTpl: b.movie_tpl || b.movie_api_url` y `tvTpl: b.tv_tpl || b.tv_api_url`.
3. Preservar `data.result` en `app/admin/page.tsx` aun cuando `success === false` para mostrar siempre la traza de pasos (`stepTraces`), el paso exacto que falló y la duración real.
4. Ampliar el timeout de seguridad de `/api/resolve` a 25,000ms para extracción fría no cacheada.
5. Sincronizar la configuración en Supabase y `supabase/seed.sql`.
