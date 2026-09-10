# Spec: Sesión persiste tras reinicio (código activo no pide re-login)

## Contexto
Usuarios reportan que al reiniciar app (Capacitor), PC o navegador, el gate pide código nuevo aunque:
- el código sigue `active` y no `revoked/expired` en `access_codes` (`lib/access.ts:24-33`)
- el navegador/app muestra `ref_code` (ej. `TV-XXXX-XXXX`) correctamente — viene de `localStorage.getItem("tvshow_ref_code")` en `components/AccessGate.tsx:15`

Flujo actual:
- `POST /api/access` valida `code_hash=sha(code)` y crea `sessions.token_hash` + cookie `tvsess` HttpOnly `SameSite=lax` `maxAge 90d` sin `Secure` (`app/api/access/route.ts:30`)
- `GET /api/providers` y `GET /api/embed-url` exigen `checkSession(req.cookies.tvsess)` (`app/api/providers/route.ts:8`, `app/api/embed-url/route.ts:19`); si falta → `401 locked` → `fetchProviders()` borra caché y lanza `locked` → `app/watch/page.tsx:48,64` muestra `<AccessGate>`
- `AccessGate` solo guarda `tvshow_ref_code` (no el código editable) y no intenta re-auth silencioso; el `tvsess` es la única prueba de sesión

Síntoma confirma: `ref_code` persiste (localStorage), pero `tvsess` se pierde al reiniciar.

## Hipótesis (a verificar)
1. **WebView Capacitor no persiste cookies** — `capacitor.config.ts:10` apunta a `https://tvshowapp-one.vercel.app` y `android/.../MainActivity.java` no configura `CookieManager.setAcceptCookie(true)` / `flush()`, así que `tvsess` es solo en memoria (H1, probabilidad alta — explica app).
2. **Cookie sin `Secure` en HTTPS** — `SameSite=lax` sin `secure:true` en prod puede ser descartada por Chrome/Brave al cerrar (H2, media).
3. **Sin fallback en cliente** — solo `ref_code` se guarda; el código real nunca se almacena, así que no hay re-login automático tras pérdida de cookie (H3, alta — explica navegador/PC también si el usuario tiene limpieza de cookies).
4. Expiración/revoked no es causa — `expires_at` 30d y `revoked=false` verificados (H4 descartada).

## Objetivos
- [ ] Al reiniciar (app, navegador, PC) con código aún `active`, NO volver a pedir código: sesión se restaura silenciosamente.
- [ ] Mantener `ref_code` visible y seguridad `HttpOnly` donde sea posible.
- [ ] Funcionar en: Chrome/Brave desktop, Capacitor WebView Android TV, PWA.

## No objetivos
- Cambiar modelo de `ref_code` único ni UI del gate (solo auto-retry).
- Soportar `STATIC_EXPORT` (sin API, fuera de alcance).

## Criterios de aceptación
- [ ] Con código activo, tras matar app / cerrar navegador / reiniciar PC y reabrir `/watch`, no aparece gate; `GET /api/providers` 200 sin re-escribir código.
- [ ] Si `tvsess` se borra manualmente (DevTools → delete cookie) pero `tvshow_code` sigue en localStorage, la siguiente navegación hace re-auth silencioso y vuelve a crear `tvsess` sin interacción.
- [ ] Si código fue revocado/expirado, el auto-retry falla y sí muestra gate con `ref_code` + `gate_revoked/gate_expired`.
- [ ] `npm run build` verde; E2E: `POST /api/access` → `GET /api/providers` → kill WebView → `GET /api/providers` sigue 200 tras fix.

## Restricciones
- Constitución: 3, 5, 6. No romper `checkSession` (`lib/access.ts:50`), mantener RLS vía `supa` service_role.
- `VIMEUS_VIEW_KEY` y plantillas siguen solo en servidor.
