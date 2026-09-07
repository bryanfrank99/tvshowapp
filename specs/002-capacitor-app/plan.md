# Plan: Capacitor shell + antibloqueo (spec ./spec.md)

## Enfoque
`server.url` → Vercel (cero refactor web). Bloqueo en `MainActivity` con
`AdBlockWebViewClient extends BridgeWebViewClient` (leer fuentes reales en
`node_modules/@capacitor/android/...` antes de codificar) + `onCreateWindow`
denegado salvo externo legítimo. Lista de hosts embebida (`adhosts.txt`:
Peter Lowe + popups conocidos).

## Archivos
| Archivo | Cambio |
| --- | --- |
| `capacitor.config.ts` | crear (appId `com.tvshow.app`, server.url prod) |
| `android/` | generar con `cap add` (gitignored) + `MainActivity.java` custom + `AdBlockWebViewClient.java` + `assets/adhosts.txt` |
| `fastlane/metadata/android/{title,short_description,full_description}.txt` | crear (F-Droid) |
| `.gitignore`, `README.md` | android/ios + docs build F-Droid |

## Decisiones
- Lista embebida, no remota: F-Droid exige builds reproducibles offline-friendly.
- `_blank` legítimo (YouTube/IMDb) → Intent externo; popups ads → denegar.
- iOS se documenta pero no se implementa (sin Mac).

## Riesgos
- API interna Capacitor distinta a la supuesta → leer fuentes instaladas primero.
- Sin Android SDK aquí: se entrega scaffold + APK lo compila el usuario en Android Studio.

## Verificación
- `npx cap sync` OK; `assembleDebug` si hay SDK; checklist manual de popup.
