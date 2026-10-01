# Spec 106: Paridad de S19 (Cinecalidad) con S20 y Soporte Multi-Mirror Original

## 1. Contexto y Problema Actual
El usuario solicita:
> "Configurar S19 exactamente como esta configurado el S20, ya que no esta cargando correctamente y usando este sistema carga un solo link en la api cuando realmente tiene 2 links en la api original y de esa forma trae fallback de mirrors"

### Diagnóstico del Estado Actual de S19 vs S20:
1. **Configuración de Endpoints en Base de Datos / Proveedor (`providers`):**
   - **S20 (PlayerFlix):** Apunta directamente al servidor y API original externa:
     - `movie_tpl`: `https://playerflix.ink/inc/Ajax.php?type=movie&id={id}&season=null&episode=null`
     - `tv_tpl`: `https://playerflix.ink/inc/Ajax.php?type=tv&id={id}&season={s}&episode={e}`
   - **S19 (Cinecalidad):** Actualmente apunta a endpoints internos proxied de la app:
     - `movie_tpl`: `/api/cinecalidad?type=movie&id={id}`
     - `tv_tpl`: `/api/cinecalidad?type=tv&id={id}&s={s}&e={e}`
     Esto introduce latencia redundante y desincroniza la arquitectura unificada de extractores directos.
2. **Pérdida de Espejos / Mirrors en la API Original:**
   - La API original de Cinecalidad (`https://tmdb.allcalidad.re/v1/playback/movie/{id}`) entrega un array de múltiples servidores (`embeds`), típicamente 2 o más opciones (por ejemplo, Vimeos y Goodstream).
   - El pipeline anterior de S19 (`vimeos_json`) utilizaba `find_in_array` buscando únicamente `vimeos`, descartando por completo los demás mirrors. Si Vimeos no respondía o si el usuario deseaba cambiar de servidor, no existían mirrors alternativos.
   - En `provider_stream_modes`, S19 estaba configurado en `hls` (exclusivo), impidiendo que se expusiera la tarjeta iframe con el selector de mirrors/opciones.
3. **Falta de Paridad con el Pipeline de S20:**
   - S20 cuenta con una acción declarativa dedicada (`playerflix_resolve_options`) que extrae simultáneamente streams directos HLS y además preserva e indexa todas las opciones originales (`embeds`) para fallback manual o automático.
   - S19 debe contar con una acción declarativa equivalente (`cinecalidad_resolve_embeds` o pipeline unificado) que procese `embeds` de AllCalidad / Cinecalidad, extraiga el stream HLS directo (de Vimeos u otros compatibles con .m3u8) y retorne **todos los links de la API original** con sus mirrors correspondientes.

---

## 2. Objetivos y Criterios de Aceptación
1. **Configuración Directa del Proveedor S19:**
   - `movie_tpl` de S19 configurado a: `https://tmdb.allcalidad.re/v1/playback/movie/{id}`
   - `tv_tpl` de S19 configurado a: `https://tmdb.allcalidad.re/v1/playback/tvshow/{id}?season={s}&episode={e}`
   - Actualizar tanto en la base de datos Supabase como en `seed.sql` y presets por defecto.
2. **Extracción y Preservación de Todos los Mirrors de la API Original:**
   - Implementar la acción de pipeline `cinecalidad_resolve_embeds` en `lib/hls-engine.ts`.
   - Mapear cada elemento del array `embeds` original (Vimeos, Goodstream, Filelions, etc.) a `embedOptions` / `options` con etiquetas descriptivas, host, calidad, y URLs originales.
   - Extraer de forma concurrente el stream HLS nativo `.m3u8` desde Vimeos (desempaquetado Packer) y subtítulos asociados.
   - Si existen múltiples streams HLS o fallbacks, incluirlos en `backupHlsUrls`.
   - Devolver la lista completa de `embeds` para que los clientes dispongan de todos los mirrors de respaldo.
3. **Modo de Transmisión Híbrido (`both`):**
   - Configurar `provider_stream_modes.cinecalidad` por defecto en `"both"`, exactamente como S20, entregando la fuente nativa `HLS - S19` como prioridad máxima y la fuente `S19 (Cinecalidad)` con sus mirrors alternativos.
4. **Verificación y Cobertura:**
   - Probar la resolución directa de una película (ej. TMDB 550 o 687163) y una serie con la API real.
   - Verificar que la API entregue tanto el stream HLS como el array con todos los links de mirrors.
   - Ejecutar `npm run build` sin errores y realizar commit y push a `main`.
