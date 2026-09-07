# Spec: app Capacitor con bloqueo nativo

## Contexto
Paso 1 (rutas query) listo. Para el binario hay dos caminos.

## Opción A (recomendada): shell nativo sobre URL
Capacitor carga `https://tvshowapp-one.vercel.app`. Cero refactor: valen SQLite
server, proxies, lovegate, tvf90 y guía XML. El plugin nativo intercepta el
WebView y bloquea ads/popups.

## Opción B: export 100% estático
Requiere convertir 8 páginas a cliente + perder tvf90 y guía XML (sin CORS) +
key TMDB horneada en el APK + lovegate debilitado. Semanas de refactor y
duplicidad web/estático.

## Objetivos (opción A)
- [ ] `npx cap init/add android` con `server.url` a producción.
- [ ] Plugin `adblock` (Kotlin): denegar `window.open`/target=_blank e intents,
  filtrar hosts de ads con EasyList+Peter Lowe embebidas.
- [ ] iOS: `WKContentRuleListStore` equivalente (requiere Mac + Xcode).
- [ ] Metadata F-Droid (`fastlane/` + `fdroiddata` recipe orientativa).

## No objetivos
- Publicar en Play Store (rechazo probable por streams de terceros).
- Modo offline (el streaming exige red igualmente).

## Criterios de aceptación
- [ ] APK debug instala y abre la web con bloqueo activo.
- [ ] Popup de prueba (VidCore play) no abre pestañas.
- [ ] Repo con `android/` ignorado en git (se genera) + docs de build.

## Restricciones
- Constitución: 5 (nada hardcodeado), 8 (sin hosting).
- Todo el código nativo FOSS (exigencia F-Droid).
