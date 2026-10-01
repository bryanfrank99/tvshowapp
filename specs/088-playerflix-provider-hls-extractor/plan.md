# Plan: Proveedor PlayerFlix con Extractor HLS (spec ../spec.md)

## Enfoque
1. Crear el módulo `lib/playerflix.ts` que se conecta a `https://playerflix.ink/inc/Ajax.php` con las cabeceras requeridas (`X-Requested-With: XMLHttpRequest`).
2. Analizar concurrentemente cada opción devuelta por PlayerFlix:
   - Para URLs de `watchplay.shop`: reutilizar/adaptar la extracción de HLS fMP4 en CDN `hclod.qzz.io` (CORS abierto, alta calidad).
   - Para URLs de `embedplayer2.xyz` / `embedplayer*.xyz`: invocar la API POST `/player/index.php?data=${id}&do=getVideo` para extraer `master.m3u8`.
   - Para otras opciones (como `embedplayabyss.top` o `superflixapi.quest`): mantenerlas como opciones secundarias o de respaldo iframe si el stream HLS no está disponible.
3. Crear el endpoint API `app/api/playerflix/route.ts` con integración a `lib/stream-cache.ts` para persistencia en Supabase.
4. Integrar en `app/api/resolve/route.ts` la detección del proveedor `playerflix` y la emisión de fuentes `Source` tipo `hls` individuales.
5. Soportar en `app/watch/page.tsx` la extracción y mezcla dinámica de PlayerFlix en el reproductor `NativeSourcePlayer`.
6. Generar la migración SQL `supabase/migration_add_playerflix_provider.sql` y el script de prueba `scripts/test-playerflix-extractor.mjs`.

## Archivos
| Archivo | Cambio |
| --- | --- |
| `lib/playerflix.ts` | **Crear** — Cliente de API PlayerFlix y extractores HLS por opción |
| `app/api/playerflix/route.ts` | **Crear** — Endpoint API con soporte de caché Supabase |
| `app/api/resolve/route.ts` | **Editar** — Detección e inyección de fuentes PlayerFlix en el Resolver |
| `app/watch/page.tsx` | **Editar** — Coordinación de extracción en frontend si aplica |
| `lib/providers.ts` | **Editar** — Registrar idiomas y subs por defecto para playerflix |
| `supabase/migration_add_playerflix_provider.sql` | **Crear** — Migración SQL para registrar el proveedor en Supabase |
| `scripts/test-playerflix-extractor.mjs` | **Crear** — Suite de pruebas automatizadas |

## Decisiones
- **Consultas con TMDB ID**: PlayerFlix requiere explícitamente IDs de TMDB; el Resolver resolverá automáticamente el ID si el usuario solicita un IMDb `tt...`.
- **Extracción paralela con Promise.all**: Cuando PlayerFlix devuelve 3 a 5 opciones, se procesan en paralelo para obtener las URLs HLS en menos de 2 segundos.
- **Prioridad HLS**: Los streams HLS extraídos se marcan con `priority: 120` para que el reproductor seleccione automáticamente reproducción nativa sin anuncios.

## Riesgos
- **Latencia de peticiones en cascada**: PlayerFlix $\rightarrow$ WatchPlay/EmbedPlayer $\rightarrow$ HLS.
  - *Mitigación*: Caché de streams en Supabase (`stream_cache`) con TTL de 24 horas y timeouts cortos (AbortController con 5-6s máx).
- **CORS en CDN de EmbedPlayer**: EmbedPlayer restringe origen en algunas peticiones de navegador.
  - *Mitigación*: WatchPlay ofrece CORS abierto total (`Access-Control-Allow-Origin: *`); se prioriza WatchPlay como stream principal y EmbedPlayer como respaldo.

## Verificación
- `node scripts/test-playerflix-extractor.mjs`
- `npm run build`
