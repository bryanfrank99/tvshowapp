# Spec: Diagnóstico y Solución Integral de Popads y Banners In-Player en la App

## 1. Contexto y Problema Reportado
El usuario reporta que al reproducir contenido dentro de la aplicación (en lugar de un navegador de escritorio con uBlock Origin), continúan apareciendo banners publicitarios invasivos sobre el reproductor de video (ejemplo capturado: banner inferior de apuestas "BC.GAME OFERTA IMPERDÍVEL ATÉ 5 BTC" con aspa de cierre y logotipo de red publicitaria sobre los controles del reproductor).

En el navegador con uBlock Origin estos anuncios no aparecen en absoluto.

### ¿Por qué ocurre esto? (Diagnóstico Técnico)
Existen cuatro diferencias críticas entre un navegador con uBlock Origin y la App actual (Android WebView / Windows Electron):

1. **Lista de bloqueo DNS/Host raquítica (191 dominios vs +300.000 reglas):**
   - La app en Android (`android/app/src/main/assets/adhosts.txt`) y en Windows (`electron/adhosts.txt`) actualmente solo contiene 189–191 dominios estáticos.
   - uBlock Origin utiliza listas globales combinadas (**EasyList**, **EasyPrivacy**, **Peter Lowe**, listas regionales de Brasil/Latinoamérica, **uBlock Filters - Annoyances** y **AdGuard**) con cientos de miles de reglas, regex y comodines. Las redes publicitarias que sirven banners de apuestas como BC.Game (Monetag, ExoClick, Propeller, Adsterra, VAST networks brasileñas) no están en la lista actual de 191 hosts de la app.

2. **Ausencia de Filtrado Cosmético (Cosmetic Filtering / CSS Injection):**
   - La mayoría de los reproductores embed de terceros inyectan los banners mediante scripts internos directamente en el árbol DOM del reproductor (`<div class="banner-overlay">`, `<div id="ad-container">`, enlaces flotantes de afiliados de casinos/cripto).
   - uBlock Origin inyecta automáticamente miles de reglas CSS en **todos los iframes y marcos** (`##.ad-banner`, `##.overlay-ad`, `##[class*="banner"]`, `##a[href*="bc.game"] { display: none !important; }`), ocultando los elementos visuales incluso si el script que los crea logra ejecutarse.
   - La App actual no cuenta con ningún motor de inyección de CSS cosmético en los iframes.

3. **Ausencia de Scriptlets / Defusers (Neutralización de VAST/IMA):**
   - uBlock Origin sustituye las librerías publicitarias de video (Google IMA, VAST 2/3/4, FluidPlayer ads, VideoJS-IMA) por respuestas simuladas o vacías (`noop-vast.xml`, `noop.js`, `set-constant`), evitando que el reproductor intente cargar o dibujar el banner.

4. **Restricción de Same-Origin en Iframes:**
   - Como los reproductores de video se cargan dentro de un `<iframe>` de un dominio externo (`pipocacine`, `playerflix`, `reidoscanais`, etc.), el código JavaScript de la web Next.js (`tvshowapp.net`) no puede manipular el DOM interno del iframe debido a la política de seguridad del navegador.
   - Solo la capa nativa con privilegios de la aplicación (el cliente WebView en Android o Electron en Windows) tiene la capacidad de interceptar las peticiones de red de los iframes e inyectar estilos o scripts de neutralización.

---

## 2. Objetivos de la Solución

1. **Actualización masiva de Hosts y Reglas de Anuncios:**
   - Ampliar drásticamente las listas de bloqueo de `android/app/src/main/assets/adhosts.txt` y `electron/adhosts.txt` incorporando las redes de anuncios de apuestas, trackers de video, VAST/VPAID y afiliados frecuentes en proveedores de streaming (ej. redes de BC.game, Monetag, Hilltop, ExoClick, AdPort, Tsyndicate, etc.).
2. **Filtrado Cosmético Global (CSS Anti-Banner):**
   - En Electron (`electron/main.js`): Inyectar CSS global mediante `webContents.insertCSS` en el frame principal y en cada subframe (`did-frame-finish-load`) para forzar `display: none !important; pointer-events: none !important` sobre selectores de banners y overlays publicitarios.
   - En Android WebView (`AdBlockWebViewClient.java` y scripts inyectados): Inyectar estilos anti-banners en la carga de frames y bloquear peticiones con extensiones o rutas típicas de anuncios VAST/banners (`/vast`, `/vpaid`, `/popads`, `.banner.`, etc.).
3. **Sandbox y Protección contra Clics en la Web:**
   - Garantizar que los iframes contengan atributos de aislamiento estricto impidiendo la apertura de popunders y popups en caso de clic accidental sobre el reproductor.
4. **Verificación Automatizada:**
   - Crear suites de pruebas para validar la expansión de dominios bloqueados, la intercepción de redes de apuestas/banners y la inyección de reglas cosméticas.

---

## 3. Criterios de Aceptación
- La lista de hosts de anuncios bloqueados cubre las redes de anuncios que sirven campañas de apuestas (BC.Game, Monetag, ExoClick, PropellerAds y derivados).
- Electron inyecta reglas CSS cosméticas en sub-frames que eliminan contenedores de banners conocidos.
- Android WebView bloquea sub-recursos de VAST/banners y no permite navegación externa de popads.
- El proyecto compila limpiamente (`npm run build`).
