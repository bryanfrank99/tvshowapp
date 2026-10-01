# Spec 093: Diagnóstico y Corrección Integral del Servidor S17 (NasriPlay)

## Contexto y Análisis Forense
El usuario reportó que el servidor **S17 (NasriPlay)** no estaba funcionando ("verifica porque S17 no esta funcionando, usa SDD").

Tras una exhaustiva auditoría del flujo de resolución y ejecución, se detectaron **4 causas raíz críticas**:

1. **Falso Positivo de Indisponibilidad por API Key Faltante (HTTP 401):**
   - En la base de datos Supabase (tabla `providers` y tabla `config` en `provider_availability_urls`), `nasriplay` tenía configurado:
     - `movie_list_url: "https://nsrplay.space/api/v1/embed/sources/movie/{id}"`
     - `tv_list_url: "https://nsrplay.space/api/v1/embed/sources/tv/{id}/{s}/{e}"`
   - Dicho endpoint de API requiere obligatoriamente una API Key (`X-API-Key`) o un token de sesión de página (`?pt=PAGE_TOKEN`). Al consultarse como URL de comprobación previa en `isRedeflixAvailable`, `nsrplay.space` respondía `HTTP 401 Unauthorized`.
   - Como resultado, el validador marcaba a S17 como **no disponible en el 100% de las películas y series**, eliminándolo de `providersData` antes de que el resolver pudiera siquiera procesarlo.

2. **Plantillas Erróneas de Embed en Base de Datos:**
   - `movie_tpl` y `tv_tpl` de S17 apuntaban a la ruta JSON `/api/v1/embed/sources/...` en lugar del reproductor web `/embed/movie/{id}` y `/embed/tv/{id}/{s}/{e}`.

3. **Invocación Client-Side con Bloqueo de CORS en el Navegador:**
   - En `app/watch/page.tsx` (líneas 363 y 716), la extracción en segundo plano y al hacer clic sobre S17 importaba directamente `@/lib/nasriplay` y ejecutaba `fetchNasriPlayStream` desde el navegador.
   - Dado que `nsrplay.space` no emite cabeceras `Access-Control-Allow-Origin: *` en sus páginas HTML y endpoints de token, el navegador bloqueaba las solicitudes por política CORS.
   - A diferencia de S18 (`/api/watchplay`), S14 (`/api/megaembed`), S19 (`/api/cinecalidad`) y S20 (`/api/playerflix`), S17 no contaba con su endpoint API de backend (`/api/nasriplay`).

4. **Saturación de Peticiones y Errores HTTP 429 (Rate Limiting):**
   - En `lib/nasriplay.ts`, para cada servidor se invocaba en paralelo `/server-url?token=...` y `/resolve?token=...`, disparando hasta 10 peticiones simultáneas por título, lo que provocaba bloqueos `HTTP 429 Too Many Requests`.

## Objetivos
- [ ] Corregir permanentemente la configuración del proveedor `nasriplay` en Supabase (limpiar `movie_list_url` y `tv_list_url`, y fijar `movie_tpl: "https://nsrplay.space/embed/movie/{id}"` y `tv_tpl: "https://nsrplay.space/embed/tv/{id}/{s}/{e}"`).
- [ ] Eliminar la entrada obsoleta de `nasriplay` en la clave `provider_availability_urls` de la tabla `config`.
- [ ] Crear el endpoint de backend `app/api/nasriplay/route.ts` para ejecutar la extracción server-side de forma segura y sin bloqueos de CORS.
- [ ] Optimizar `lib/nasriplay.ts` para aprovechar el `directUrl` y `playUrl` entregados directamente por `nsrplay.space` sin saturar la API con llamadas redundantes que disparen HTTP 429.
- [ ] Actualizar `app/watch/page.tsx` para consultar `/api/nasriplay` en lugar de invocar `fetchNasriPlayStream` en el navegador del cliente.
- [ ] Crear suite de pruebas dedicada `scripts/test-nasriplay-provider.mjs` y verificar funcionamiento con `npm run build`.

## Criterios de Aceptación
- [ ] S17 aparece activo en `/api/resolve` para títulos disponibles en NasriPlay, entregando tanto el stream HLS nativo (`HLS - S17`) como su servidor unificado (`S17`).
- [ ] La extracción en segundo plano en `app/watch/page.tsx` se realiza a través de `/api/nasriplay` sin errores de CORS en la consola del navegador.
- [ ] No se producen errores HTTP 429 por saturación en `lib/nasriplay.ts`.
- [ ] La suite de pruebas de S17 pasa al 100%.
- [ ] `npm run build` compila con 0 errores.
