# Spec 061: Integración del Proveedor Cinecalidad (Iframe + AdBlock)

## 1. Contexto y Justificación
Se descubrió la API oficial de reproducción de Cinecalidad vinculada 1:1 a identificadores de TMDB:
- Películas: `https://tmdb.cinecalidad.am/v1/playback/movie/{tmdb}`
- Series: `https://tmdb.cinecalidad.am/v1/playback/tvshow/{tmdb}?season={s}&episode={e}`

Esta API devuelve un JSON estructurado con metadatos de audio (`"lang": "Latino"`), calidad (`"quality": "Full HD"`) y enlaces de embed (`vimeos.net`, `goodstream.one`). Además:
- Si el contenido existe, devuelve `HTTP 200` con el arreglo `embeds`.
- Si no existe, devuelve `HTTP 404` (`{"error":{"code":"not_found","message":"item not found"}}`), siendo 100% compatible con nuestro sistema de Probe URLs.
- Posee cabeceras CORS totalmente abiertas (`access-control-allow-origin: *`).

Se requiere implementar la opción más simple y robusta: **Iframe Embed con AdBlock**, permitiendo reproducir contenido en Español Latino de alta calidad sin fricciones ni riesgo de tokens caídos.

---

## 2. Requerimientos del Sistema

### R1. Registro del Proveedor Cinecalidad (`cinecalidad`)
- Identificador canónico: `cinecalidad` (Etiqueta `S15` por orden `15`).
- Nombre visible: `Cinecalidad (Latino)`.
- Flags:
  - `needs_tmdb`: `true` (requiere ID de TMDB numérico).
  - `tv_ok`: `true` (soporta tanto películas como episodios de series con `?season={s}&episode={e}`).
  - `active`: `true`.
  - `ord`: `15`.
  - `lang`: `"es"` (Audio Español Latino).
- URLs de Disponibilidad de Catálogo:
  - `movie_list_url`: `https://tmdb.cinecalidad.am/v1/playback/movie/{id}`
  - `tv_list_url`: `https://tmdb.cinecalidad.am/v1/playback/tvshow/{id}?season={s}&episode={e}`
- Plantillas de Reproducción:
  - `movie_tpl`: `/api/cinecalidad?type=movie&id={id}`
  - `tv_tpl`: `/api/cinecalidad?type=tv&id={id}&s={s}&e={e}`

### R2. Endpoint de Redirección y Resolución `/api/cinecalidad`
- Parámetros: `type` (`movie` | `tv`), `id` (TMDB ID), `s` (temporada), `e` (episodio).
- Consulta `https://tmdb.cinecalidad.am/v1/playback/...`.
- Extrae el primer embed disponible (o el de mayor estabilidad, ej. `vimeos.net` / `goodstream.one`).
- Responde con `307 Temporary Redirect` directamente hacia la URL del embed para que cualquier iframe o cliente lo cargue fluidamente.
- Si no hay contenido o la API responde 404, retorna respuesta JSON 404.

### R3. Enriquecimiento Dinámico en `/api/resolve`
- Al resolver fuentes para un título en `app/api/resolve/route.ts`:
  - Si el proveedor `cinecalidad` está activo y disponible, consultar su API para obtener los embeds disponibles.
  - Inyectar las fuentes como `streamType: "iframe"` con `lang: "Latino"`, `quality: "Full HD"`, nombre claro (`S15 Cinecalidad (Latino)`).
  - Si existen múltiples hosts (`vimeos.net`, `goodstream.one`), generar fuentes con fallback o ambas opciones para máxima resiliencia.

### R4. AdBlocker y Listas Blancas (Android WebView y Web)
- Actualizar `android/app/src/main/java/com/tvshow/app/AdBlockWebViewClient.java`:
  - Añadir `vimeos.net`, `goodstream.one`, `cinecalidad.am` a la lista de hosts permitidos (`allow`) dentro del WebView para evitar que se abran en navegadores externos o se bloqueen por error.
  - Asegurar que las reglas de bloqueo publicitario y desarmado de popups (`defusers`) sigan actuando sobre las publicidades de esos reproductores.
- Actualizar `capacitor.config.ts`:
  - Añadir `vimeos.net`, `*.vimeos.net`, `goodstream.one`, `*.goodstream.one`, `cinecalidad.am`, `*.cinecalidad.am` a `allowNavigation`.

### R5. Prioridad de Servidor por Idioma
- Configurar `S15` como candidato prioritario para el idioma `es` (Español Latino) en el sistema multicapa de prioridades (`provider_priorities_by_lang`).
