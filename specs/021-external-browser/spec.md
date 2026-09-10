# Spec: Limitar apertura de navegador externo en Android

## Contexto
En Android (`capacitor.config.ts:10` `server.url=https://tvshowapp-one.vercel.app`) los embeds (myembed.biz, redeflixapi.store, pipocacine.lat, vidcore.io, etc.) redirigen o hacen `window.open` a ads → `AdBlockWebChromeClient.java:32` lanza `Intent.ACTION_VIEW` a navegador externo para todo no bloqueado, y `AdBlockWebViewClient.java:35` delega a `BridgeWebViewClient` que también abre externo. Usuario pide limitar que nunca se abra navegador externo mientras se usa la app.

## Objetivos
- [ ] Ningún click/popup dentro del player o app abre navegador externo (Chrome) sin consentimiento explícito.
- [ ] Iframes de proveedores siguen funcionando dentro del WebView.
- [ ] Ads/redirecciones bloqueadas silenciosamente (ya hace `AdBlock.isBlocked`).

## No objetivos
- Permitir “Abrir externo” manual (si se reintroduce, debe ser `Intent` explícito del usuario).
- Cambiar web (`/watch`) — solo capa Android.

## Criterios de aceptación
- [ ] En APK, tocar un ad que antes abría Chrome → ahora se queda en app (bloqueado o cargado interno sin salir).
- [ ] `myembed.biz/filme/550`, `redeflixapi.store/filme/19995`, `pipocacine.lat/embed/550` cargan dentro del iframe sin disparar externo.
- [ ] `android/build-apk.bat` `BUILD SUCCESSFUL`, `shouldOverrideUrlLoading` no delega a externo para hosts no allowlist.

## Restricciones
- Constitución: 3, 5, 6. Solo `android/app/src/main/java/com/tvshow/app/*` + `capacitor.config.ts` opcional `allowNavigation`.
