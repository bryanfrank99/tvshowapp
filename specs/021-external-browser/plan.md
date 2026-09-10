# Plan: Bloquear navegador externo en Android

## Enfoque
Interceptar top-level navigations y popups antes de que Capacitor lance `Intent`. Allowlist mínima, resto bloqueado in-app.

## Archivos
| Archivo | Cambio |
| --- | --- |
| `AdBlockWebViewClient.java` | `shouldOverrideUrlLoading`: `isBlocked→true`, host allowlist (`tvshowapp-one.vercel.app`, `localhost`, `capacitor://`) → `false` (interno), `embed` hosts (`myembed.biz`, `redeflixapi.store`, `pipocacine.lat`, `vidcore.io`, `vidzy.org`, `vimeus.com`, `multiembed.mov`, `moviesapi.to`, `cinesrc.st`, `player.vidzee.wtf`, `embos.top`, `vidapi.xyz`, `streambetter.shop`) → `false` (permitir iframe/nav interno), resto → `true` (bloquear externo sin Intent) |
| `AdBlockWebChromeClient.java` | `onCreateWindow`: no `Intent.ACTION_VIEW`; si `isBlocked` → `true` bloqueado; si allowlist/embed → `view.loadUrl(url)` en WebView principal o `WebView tmp` interno; resto → bloqueado. `onCloseWindow` mantiene `destroy()` |
| `capacitor.config.ts` | Añadir `server.allowNavigation: ['myembed.biz','redeflixapi.store','pipocacine.lat','vidcore.io',...]` para que Capacitor no trate iframes como externo (opcional, alternativo al allowlist Java) |

## Verificación
- `android/build-apk.bat` log sin `Intent`
- Manual: abrir `/watch` con cada provider, click en ad → `adb logcat | grep -i intent` no muestra `ACTION_VIEW`.

## Riesgos
- Bloquear demasiado puede romper `IMDb/TMDB` badge si se reintroduce; mitigado al permitir `allowNavigation` pero mantener top-level bloqueado salvo esos dominios.
