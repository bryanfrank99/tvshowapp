# Spec 101: Conexión Directa de S20 (PlayerFlix) al Servidor Original y Entrega de Opciones de Reproducción Nativas

## 1. Contexto y Diagnóstico del Problema

Actualmente, el proveedor **S20 (PlayerFlix)** presenta fallos totales de reproducción debido a que:
1. **Uso de Proxies Locales Rotos (`/api/playerflix/proxy`):**
   - El extractor anterior intentaba descargar un stream HLS firmado de `embedplayer2.xyz` y enrutar los segmentos a través de un endpoint proxy interno de Next.js (`/api/playerflix/proxy?url=...`). Esas URLs poseen firmas MD5 y tokens temporales que caducan a los pocos minutos, además de validación de IP por parte del CDN, lo que provocaba un fallo absoluto (`403 Forbidden` o pantalla negra) al intentar reproducir.
2. **Descarte de Opciones de Embed Originales:**
   - La API original de PlayerFlix en `https://playerflix.ink/inc/Ajax.php` entrega un arreglo completo de opciones de reproducción bajo `data.options`:
     - **Embed Play (PT-BR / EN-US):** `https://embedplayabyss.top/player.html?v=...`
     - **VIP Player:** `https://embedplayer2.xyz/video/...`
     - **Premium (SuperFlix):** `https://superflixapi.quest/filme/...` (películas) / `https://superflixapi.quest/serie/...` (series)
     - **WatchPlay:** `https://v1.watchplay.shop/tvshow/...` (series)
   - El código en `lib/playerflix.ts` descartaba intencionalmente todas estas opciones válidas con `return null`, dejando al reproductor sin alternativas cuando el proxy fallaba.
3. **Falta de Alineación con el Motor Declarativo JSON (Spec 097):**
   - S20 utilizaba una acción opaca `extract_playerflix` con código estático en TypeScript en lugar de un flujo declarativo y editable en JSON desde `/admin`.

---

## 2. Objetivos de la Especificación

1. **Consulta Directa a la URL Original de PlayerFlix:**
   - Configurar el pipeline declarativo JSON para que consulte directamente:
     - Películas: `https://playerflix.ink/inc/Ajax.php?type=movie&id={id}&season=null&episode=null`
     - Series: `https://playerflix.ink/inc/Ajax.php?type=tv&id={id}&season={s}&episode={e}`
   - Utilizar las cabeceras requeridas (`X-Requested-With: XMLHttpRequest`, `Referer: https://playerflix.ink/`, `User-Agent` de navegador desktop).
2. **Nuevo Paso Declarativo en el Motor (`playerflix_resolve_options`):**
   - Crear una acción nativa en `lib/hls-engine.ts` que reciba `data.options` y `data.title`, transformando cada elemento en una opción de embed directa hacia el servidor original:
     - URLs 100% directas sin pasar por `/api/playerflix/proxy`.
     - Preservación de etiquetas (`Embed Play`, `VIP Player`, `Premium`, `WatchPlay`), idiomas (`pt`, `en`) y servidores.
3. **Entrega Homogénea en `/api/resolve`:**
   - Proveer a la aplicación y al reproductor la lista de fuentes `embedOptions` limpias que apunten a los servidores externos originales, garantizando que el usuario pueda reproducir inmediatamente.
4. **Verificación en el Live Test de Admin (`/admin`):**
   - Probar en vivo S20 desde el panel de administración mostrando el título, duración y la lista de todos los servidores originales devueltos.

---

## 3. Criterios de Aceptación

- [ ] `lib/hls-engine.ts` incluye la acción declarativa `playerflix_resolve_options`.
- [ ] `EXTRACTOR_PRESETS.playerflix` y `supabase/seed.sql` están configurados con el pipeline JSON declarativo completo de PlayerFlix.
- [ ] La respuesta de `/api/resolve` para S20 entrega URLs de servidores originales (`embedplayabyss.top`, `embedplayer2.xyz`, `superflixapi.quest`, `watchplay.shop`) y elimina las rutas locales obsoletas `/api/playerflix/proxy`.
- [ ] La prueba en `/admin` para películas (ej. ID `687163` o `550`) y series (ej. ID `1399` GoT) muestra `✓ Extracción Exitosa` con la lista de embeds originales.
- [ ] `npm run build` compila con 0 errores de tipado TypeScript y validación de sintaxis.
