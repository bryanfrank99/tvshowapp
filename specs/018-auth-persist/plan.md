# Plan: Sesión persistente tras reinicio

## Enfoque
Probar H1-H3 en orden, corregir capa cliente + cookie y validar en WebView.

### 1. Diagnóstico (sin código aún)
- [ ] Inspeccionar `android/app/src/main/java/com/tvshow/app/MainActivity.java`: ¿llama `CookieManager.getInstance().setAcceptCookie(true)` / `setAcceptThirdPartyCookies` y `flush()`? Registrar `adb logcat` de `CookieManager`.
- [ ] En desktop: DevTools → Application → Cookies `tvsess` tras `POST /api/access`: ver `Secure`, `SameSite`, `Expires`. Confirmar que tras cerrar/reabrir Brave persiste. Probar con `Secure` off vs on.
- [ ] En Capacitor: `adb shell run-as com.tvshow.app sqlite` no aplica; usar `chrome://inspect` → WebView → Application → Cookies tras kill.

### 2. Fix servidor — cookie persistente
- `lib/access.ts` extraer `sessionCookieOpts()`:
  ```ts
  { httpOnly:true, secure: process.env.NODE_ENV==="production", sameSite:"lax", path:"/", maxAge: 90*24*3600 }
  ```
  Aplicar en `app/api/access/route.ts:30` y en `DELETE`. Motivo: Chrome exige `Secure` para cookies persistentes en HTTPS; sin él se descartan al reiniciar (H2).
- Añadir `GET /api/access` (verify): `checkSession(cookie) → {ok:true, ref_code?}` sin exponer token; usado por cliente para sondeo.

### 3. Fix cliente — re-auth silencioso
- `components/AccessGate.tsx` ya guarda `tvshow_ref_code`; añadir `tvshow_code` (código en claro, `localStorage`, solo si usuario opta) o mejor `tvshow_code_hash` no sirve para re-auth. Decisión: guardar `tvshow_code` en `localStorage` tras `POST ok` (tradeoff UX vs riesgo XSS; mitigado por CSP y sin `code_hash` reversible). Alternativa segura: guardar `token` no-HttpOnly duplicado `tvshow_sess` en localStorage como backup para WebView.
- Propuesta elegida: **guardar `code` en localStorage `tvshow_code` + `ref_code`** y en `hooks/useSession.ts` (nuevo) al montar: si `fetch(/api/providers)` 401 y `localStorage.tvshow_code` existe → `POST /api/access {code}` silencioso → si ok, `clearProvidersCache()` y reintentar. Si falla por `revoked/expired`, borrar `tvshow_code` y mostrar gate con mensaje.
- `lib/providers.ts:72` ya distingue `locked` vs red; mantener borrado de caché solo en `locked`.

### 4. Fix Android — persistencia WebView
- `MainActivity.java` en `onCreate`/`onResume`:
  ```java
  CookieManager cm = CookieManager.getInstance();
  cm.setAcceptCookie(true);
  if (Build.VERSION.SDK_INT >= 21) cm.setAcceptThirdPartyCookies(webView, true);
  cm.flush();
  ```
  Y en `onPause` flush. Evita pérdida de `tvsess` en memoria (H1).

### 5. Verificación
- `npm run build` + `npm run dev` → login → DevTools borrar cookie → navegar → debe auto-restaurar sin gate.
- APK `android/build-apk.bat` → instalar → login → `adb shell am force-stop com.tvshow.app` → relanzar → no gate.
- Revocar código en Supabase → siguiente `GET /api/providers` debe caer a gate con `gate_revoked`.

## Archivos
| Archivo | Cambio |
| --- | --- |
| `lib/access.ts` | `sessionCookieOpts()` con `secure` |
| `app/api/access/route.ts` | `GET verify` + `res.cookies.set(...sessionCookieOpts())` |
| `components/AccessGate.tsx` | guardar `tvshow_code` + usar `ref_code` de respaldo |
| `hooks/useSession.ts` | nuevo: `ensureSession()` con re-auth silencioso |
| `app/watch/page.tsx` | usar `ensureSession()` antes de `fetchProviders` |
| `android/app/src/main/java/com/tvshow/app/MainActivity.java` | `CookieManager` persist |
| `lib/providers.ts` | no borrar caché en verify, solo en locked real |

## Riesgos
- XSS con `tvshow_code` en LS: mitigar con `sanitize` y no loguear; alternativa token backup evaluada.
- Doble `POST` en montaje: guard con `inflight` en `useSession`.

## Verificación
- `GET /api/access` 200 tras reinicio, `GET /api/providers` 200, gate no aparece.
