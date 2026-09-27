# Spec 048: Diagnóstico y Solución Integral Definitiva de Popads y Banners en la App de Windows

## 1. Pregunta del Usuario y Diagnóstico Exhaustivo

**Pregunta del usuario:**
> *"todavia continuan apareciendo estos popads, estamos usando la extencion de ublock origin en la app de windows?"*

### Respuesta Técnica y Diagnóstico:
1. **¿Se está usando uBlock Origin en Windows?**
   - En el código de la app de Windows (`electron/`), se incluye y carga **uBlock Origin Lite (uBOL)** (versión Manifest V3 desarrollada por Raymond Hill para Chromium).
   - **Sin embargo, NO opera de la misma manera que en un navegador de escritorio (Chrome/Firefox):**
     a. **Sin Interfaz de Usuario (Toolbar):** Electron no posee una barra de extensiones ni menú contextual de extensiones. En Chrome, uBOL requiere que el usuario haga clic en su icono para otorgar permisos a todos los sitios y activar el modo *"Filtrado Completo"* (Complete Mode). En Electron, opera en modo básico sin poder solicitar interacción de usuario.
     b. **Listas de Anuncios Regionales y Overlays desactivadas por defecto:** En el empaquetado inicial de uBOL, reglas como `annoyances-overlays.json` y la lista brasileña `bra-0.json` (que cubre redes como `eb.lactamclaes.com` y anuncios en portugués como el banner de apuestas BC.Game) vienen con `"enabled": false`.
     c. **Diferencia entre uBlock Origin clásico (MV2) y uBOL (MV3):** El navegador del usuario tiene uBlock Origin clásico (MV2), que inyecta universalmente scriptlets de neutralización profunda (`set`, `nano-stb`, defusers) y CSS cosmético en todos los iframes anidados sin restricciones de permisos MV3.

2. **¿Por qué el usuario sigue viendo popads en su app instalada de Windows?**
   - **El ejecutable `TVShow.exe` instalado en el ordenador del usuario es un binario compilado localmente previo:**
     - Las modificaciones en `app/` (Next.js) se despliegan automáticamente a `https://tvshowapp.net` vía Vercel al hacer `git push`.
     - Pero los cambios en `electron/main.js`, `electron/adhosts.txt` o `electron/adblock.js` son **código nativo de Electron empaquetado en el instalador**. Si el usuario tiene instalada la versión previa y no ha recompilado o reinstalado el `.exe` (o ejecutado `npm run electron:dev`), la aplicación instalada sigue ejecutando el motor antiguo de Electron.
   - **El iframe en el frontend web (`components/player/IframeSourcePlayer.tsx`) carecía de sandbox por defecto:**
     - Al no tener el atributo `sandbox` definido, el iframe de terceros tenía permiso total de invocar `window.open` y crear ventanas emergentes o hitboxes de clics sobre la pantalla.

---

## 2. Solución en 3 Capas (Web + Electron + Android)

### Capa 1: Capa Web Inmediata (`components/player/IframeSourcePlayer.tsx`)
- Configurar un `sandbox` defensivo por defecto en todos los reproductores embed de iframe:
  `sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"`
- **Propiedades críticas:**
  - `allow-same-origin`: Permite que el reproductor inicialice su almacenamiento, cookies y pase las comprobaciones `isSandboxed()` sin romper el streaming.
  - **Omisión intencional de `allow-popups` y `allow-top-navigation`:** El motor Chromium del navegador o Electron bloquea a nivel de sandbox CUALQUIER llamada a `window.open(...)` o redirección de ventana sin importar qué script publicitario lo intente.
  - Como esta capa reside en Next.js, surte efecto instantáneo en la web y en la app de Windows que carga `tvshowapp.net`.

### Capa 2: Capa Electron Nativa (`electron/main.js`, `electron/adblock.js`, `electron/adhosts.txt`, `ubol`)
- **Actualización de dominios bloqueados:** Añadir `lactamclaes.com`, `waust.at`, y derivados de redes de apuestas.
- **Defusing y Purga de Hitbox:** En `mainWindow.webContents.on('did-frame-finish-load')`:
  - Neutralizar funciones de publicidad (`window.open`, `window.rfShouldCheckAdblock`, `window.openExternalAd`, `window.triggerExternalAd`, `window.armExternalClickHitbox`).
  - Destruir el elemento `#player-external-click-hitbox` del DOM mediante script e intervalo continuo.
  - Prevenir que el detector de adblock de redeflix (`rfDetectAdBlocker`) active el falso bloqueo.
- **Configuración de uBOL:** Activar en `manifest.json` los rulesets `annoyances-overlays`, `annoyances-others` y `bra-0` con `"enabled": true`.

### Capa 3: Capa Android Nativa
- Sincronizar `android/app/src/main/assets/adhosts.txt` con las nuevas redes de anuncios descubiertas.

---

## 3. Criterios de Aceptación
1. `IframeSourcePlayer.tsx` cuenta con sandbox restrictivo sin `allow-popups`, previniendo popups/popunders en la web y la app.
2. `adhosts.txt` y `electron/adblock.js` interceptan `lactamclaes.com` y `waust.at`.
3. `electron/main.js` purga de forma reactiva el hitbox de clics `#player-external-click-hitbox` y neutraliza `window.open` en frames.
4. `ubol/manifest.json` tiene activados los rulesets de annoyances y listas regionales.
5. El proyecto compila limpiamente (`npm run build`) y pasa todas las pruebas.
