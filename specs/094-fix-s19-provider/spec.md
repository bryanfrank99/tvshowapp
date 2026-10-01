# Spec 094: Corrección Integral del Servidor S19 (Cinecalidad Latino)

## 1. Contexto y Problema
El servidor **S19 (Cinecalidad Latino)** no está funcionando ni cargando contenidos en la aplicación.

### Análisis de Causas Raíz
1. **Falso Positivo de Indisponibilidad (Causa Principal):**
   - En la base de datos Supabase (tabla `providers`), `cinecalidad` (`ord: 19`) tenía configurada la columna `movie_list_url` apuntando a `https://tmdb.cinecalidad.am/v1/playback/movie/{id}`.
   - Debido a que el subdominio `tmdb.cinecalidad.am` fue desmantelado y devuelve `HTTP 404`, el subsistema de comprobación de catálogo de Redeflix (`isRedeflixProvider` y `isRedeflixAvailable`) marcaba a Cinecalidad como **no disponible en el 100% de los títulos**, excluyendo el servidor de la lista antes de extraer fuentes.
2. **Dominio de API de Playback Obsoleto:**
   - La librería `lib/cinecalidad.ts` consultaba `https://tmdb.cinecalidad.am/v1/playback/movie/{id}` y `https://tmdb.cinecalidad.am/v1/playback/tvshow/{id}`.
   - El backend oficial activo de Cinecalidad opera actualmente en `https://tmdb.allcalidad.re/v1/playback/...`, el cual responde `HTTP 200 OK` con los embeds y streams en audio Latino (Vimeos, Goodstream, Filelions, Streamtape).
3. **Ausencia de Fallback Unificado en el Resolver:**
   - Cuando la extracción directa de HLS fallaba, `/api/resolve/route.ts` retornaba `[]` para Cinecalidad si no se resolvían embeds, ocultando por completo a S19 de la lista de servidores.
   - Además, `cinecalidad` debe proveer una tarjeta unificada con `embedOptions` para que el usuario pueda alternar entre servidores cuando use el modo iframe.

## 2. Solución Arquitectónica
1. **Base de Datos Supabase:**
   - Vaciar `movie_list_url` y `tv_list_url` en el registro `cinecalidad` de la tabla `providers` (evitar chequeo erróneo de Redeflix).
   - Asegurar `enabled: true`, `ord: 19`, `lang: 'es'`, `languages: ['es', 'lat']`.
   - Actualizar `supabase/seed.sql`.
2. **Actualizar `lib/cinecalidad.ts`:**
   - Cambiar la URL base de la API de playback de `https://tmdb.cinecalidad.am` a `https://tmdb.allcalidad.re`.
   - Añadir encabezados correctos (`Referer: https://cinecalidad.am/`) en las peticiones.
   - Asegurar la extracción y retorno de `embeds` (`vimeos.net`, `goodstream.one`, `filelions.online`, `streamtape.com`).
3. **Optimizar `app/api/resolve/route.ts`:**
   - Asegurar que S19 retorne tanto la fuente `HLS - S19` (cuando el stream directo esté disponible) como la tarjeta unificada de iframe `S19` con `embedOptions` en audio Latino.
4. **Verificación:**
   - Crear suite de pruebas `scripts/test-s19-provider.mjs` que certifique películas y series tanto en HLS como en iframe unificado.
   - Ejecutar `npm run build` sin errores.
