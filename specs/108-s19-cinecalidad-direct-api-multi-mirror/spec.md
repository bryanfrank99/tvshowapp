# Spec 108: S19 (Cinecalidad) API Original Directa y Soporte Multi-Mirror

## 1. Contexto y Problema
El servidor S19 (Cinecalidad) estaba sufriendo fallos críticos en la experiencia del usuario:
1. **Dominio Desactualizado:** Las llamadas consultaban el dominio `https://tmdb.allcalidad.re/` en lugar de la API original actual `https://tmdb.cinecalidad.am/`.
2. **Paso Extra Innecesario y Bloqueo de IP:** El sistema intentaba desempaquetar el embed de Vimeos en el servidor backend para extraer un enlace `.m3u8` (`https://p3.vimeos.zip/...`). Este stream está firmado y enlazado a la dirección IP del servidor que lo desempaquetó (`&v=<ip_hash>`), provocando que cuando el navegador o televisor del cliente intentaba reproducirlo, la reproducción fallara o se quedara cargando indefinidamente ("el nuestro no carga porq estamos haciendo un paso extra inecesario").
3. **Pérdida de Servidores y Mirrors de Respaldo:** La API original devuelve múltiples servidores listos para streaming (ej. Vimeos + Goodstream). Nuestro pipeline descartaba Goodstream, dejando `backupUrls: []` vacío y sin mirrors para el usuario ("usando este sistema carga un solo link en la api cuando realmente tiene 2 links en la api original y de esa forma trae fallback de mirrors").
4. **Código Legacy en `app/watch/page.tsx`:** Existían llamadas residuales del lado del cliente (`/api/cinecalidad?stream=1`) que secuestraban la fuente de Cinecalidad y la mutaban en tiempo de ejecución, a diferencia de servidores modernos como S20 o S14 que se gestionan 100% a través del Motor de Extracción HLS y `/api/resolve`.

## 2. Requerimientos
1. **Actualización de Dominio:**
   - Migrar de `https://tmdb.allcalidad.re/` a `https://tmdb.cinecalidad.am/` en toda la base de código (BD Supabase, `seed.sql`, `lib/hls-engine.ts`, `lib/cinecalidad.ts`, `app/api/cinecalidad/route.ts`).
   - URLs de endpoints:
     - Películas: `https://tmdb.cinecalidad.am/v1/playback/movie/{id}`
     - Series: `https://tmdb.cinecalidad.am/v1/playback/tvshow/{id}?season={s}&episode={e}`
2. **Pipeline Declarativo idéntico a S20:**
   - La API original de S19 entrega `embeds: [...]` (`url`, `server`, `host`, `lang`, `quality`, `subtitle`).
   - El paso de extracción `cinecalidad_resolve_embeds` debe construir la lista completa de `embeds` estructurados (`Vimeos`, `Goodstream`, etc.) con sus etiquetas, idioma, presupuesto y favicon.
   - Eliminar el desempaquetado intrusivo de `p3.vimeos.zip` que bloquea la IP del cliente. Si una opción ya es un `.m3u8` directo, se toma; de lo contrario, se entregan las opciones originales de streaming listas para el reproductor.
   - Configurar la entrega en `/api/resolve` para emitir la tarjeta multi-mirror con todas las opciones disponibles en la cabecera del reproductor (`🌐 Mirrors: [Vimeos (Full HD)] [Goodstream (Full HD)]`).
3. **Limpieza del Reproductor (`app/watch/page.tsx`):**
   - Remover los bloques legacy en `watch/page.tsx` que hacían llamadas manuales a `/api/cinecalidad?stream=1` y mutaban el reproductor.
   - Dejar a S19 funcionando exactamente bajo la misma arquitectura declarativa unificada de S20.
4. **Persistencia en Supabase:**
   - Actualizar tabla `providers` para `cinecalidad`: `movie_tpl` y `tv_tpl` apuntando a `https://tmdb.cinecalidad.am/...`.
   - Actualizar `provider_extractor_configs.cinecalidad` con el pipeline declarativo actualizado.
   - Limpiar la tabla de caché de streams para `cinecalidad` para evitar residuos de `.m3u8` obsoletos o bloqueados.
