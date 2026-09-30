# Spec 062: Extractor de Stream Nativo para MegaEmbed (100% Compatible con Android TV)

## 1. Contexto y Justificación
Actualmente, los títulos de películas y series reproducidos mediante `<iframe>` (sitios web de terceros como MegaEmbed, VidCore, Cinecalidad) sufren de graves problemas de usabilidad en dispositivos Android TV:
1. **Falta de foco de teclado / D-pad:** Los reproductores web dentro de iframes carecen de atributos accesibles y estados `:focus`.
2. **Capas invisibles y popups:** Trampas publicitarias que requieren clics de ratón o toques físicos, bloqueando el control remoto.
3. **Imposibilidad de adelantar, retroceder o pausar:** El usuario no puede controlar el tiempo de reproducción con las teclas del mando.

Por el contrario, la sección de **TV en Vivo (`/live`)** funciona al 100% con el mando de la TV porque utiliza **streams HLS directos (`.m3u8`)** reproducidos a través de nuestro componente nativo [`NativeSourcePlayer.tsx`](file:///C:/Users/Administrator/.gemini/antigravity/scratch/tvshowapp/components/player/NativeSourcePlayer.tsx).

En las pruebas técnicas de ingeniería inversa sobre MegaEmbed (`https://megaembed.com/embed/{id}` y `https://megaembed.com/embed/{id}/{s}/{e}`), se descubrió que:
- MegaEmbed expone un arreglo de streams directos en su HTML inicial: `var sources = [{"file": "https://...master.m3u8...", "type": "hls", "label": "Opção 2"}, ...]`.
- El stream HLS (`playercdn.xyz`) responde con **HTTP 200 OK** y posee cabecera abierta **`Access-Control-Allow-Origin: *`** en la lista maestra, sub-listas y segmentos `.ts`.
- No requiere cookies propietarias ni encabezados bloqueantes para la reproducción de video.

Por tanto, podemos implementar un **Extractor de Stream Nativo** que obtenga el `.m3u8` directo de MegaEmbed y lo entregue a `NativeSourcePlayer`, logrando una experiencia 100% compatible con el mando de Android TV (Pausa/Play con OK, Seek 10s con Izquierda/Derecha, Volumen con Arriba/Abajo y salida limpia con Back).

---

## 2. Requerimientos del Sistema

### R1. Módulo Extractor de MegaEmbed (`lib/megaembed.ts`)
- Implementar la función `fetchMegaEmbedStream({ id, type, season, episode })`:
  - Recibe identificador TMDB o IMDb.
  - Genera la URL de consulta:
    - Películas: `https://megaembed.com/embed/${id}`
    - Series: `https://megaembed.com/embed/${id}/${season}/${episode}`
  - Realiza petición HTTP con cabecera `User-Agent` de navegador moderno.
  - Parsea el arreglo de fuentes `var sources = [...]`.
  - Prioriza y valida la fuente de tipo `hls` (`.m3u8`).
  - Retorna la URL directa del stream `.m3u8` y la etiqueta de calidad.
  - En caso de error o ausencia de stream, retorna `null` de forma segura.

### R2. Endpoint de Redirección / API (`app/api/megaembed/route.ts`)
- Endpoint Next.js `/api/megaembed?type=movie|tv&id=...&s=1&e=1`:
  - Permite invocar la extracción tanto desde el backend de resolución como bajo demanda.
  - Si se solicita con flag `redirect=1`, responde con `307 Temporary Redirect` hacia el `.m3u8` directo.
  - Si se solicita por defecto, retorna JSON `{ success: true, url: string, type: "hls" }`.

### R3. Integración en el Resolver Central (`app/api/resolve/route.ts`)
- Al procesar el proveedor `megaembed` (`S14`):
  - Ejecutar el extractor `fetchMegaEmbedStream`.
  - Si el stream directo `.m3u8` es obtenido con éxito:
    - Inyectar una fuente nativa:
      - `id`: `megaembed-native`
      - `providerId`: `megaembed`
      - `providerName`: `S14`
      - `realName`: `MegaEmbed (Nativo TV 100%)`
      - `type`: `hls`
      - `url`: URL directa del `.m3u8`
      - `priority`: `120` (Prioridad máxima para que sea seleccionada por defecto en Android TV)
    - Inyectar la versión `iframe` tradicional como fallback secundario (`priority: 40`).
  - Si el extractor no encuentra stream, mantener la versión `iframe` como fallback normal.

### R4. Soporte Universal de Reproducción HLS en `NativeSourcePlayer`
- Actualmente `NativeSourcePlayer` asigna `video.src = source.url`.
- En **Android TV** y **Safari**, los navegadores soportan HLS de forma nativa (`video.canPlayType('application/vnd.apple.mpegurl')`).
- Para **Windows Electron** y navegadores de escritorio que no poseen soporte nativo de HLS:
  - Integrar `hls.js` en `NativeSourcePlayer.tsx` condicionalmente:
    - Si el navegador soporta HLS nativo: usar `video.src = source.url`.
    - Si no lo soporta y `Hls.isSupported()`: inicializar `new Hls()` y vincular al elemento `video`.
  - Asegurar que todos los controles de control remoto (D-Pad Center/Enter, Izquierda/Derecha para Seek, Arriba/Abajo para Volumen) operen con el stream HLS.

### R5. Configuración de Red en Android y Capacitor
- Actualizar `android/app/src/main/java/com/tvshow/app/AdBlockWebViewClient.java`:
  - Permitir dominios de CDN de streaming: `playercdn.xyz`, `*.playercdn.xyz`, `megaembed.com`, `*.megaembed.com`.
- Actualizar `capacitor.config.ts`:
  - Añadir dichos dominios a `allowNavigation`.

### R6. Verificación y Pruebas Automatizadas
- Crear script `scripts/test-megaembed-extractor.mjs` que valide:
  1. Extracción de stream HLS para película (ej. TMDB 969681 / IMDb tt15239678).
  2. Extracción de stream HLS para episodio de serie (ej. The Last of Us / Dune Prophecy).
  3. Verificación de cabeceras HTTP 200 y `Access-Control-Allow-Origin: *` del playlist master y sub-playlists.
  4. Resolución completa a través de `/api/resolve` mostrando la fuente `type: "hls"`.
