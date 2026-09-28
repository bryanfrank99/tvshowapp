# Plan 051 — S11 EmbedMovies: Reproducción en Android

## Cambios

### 1. `capacitor.config.ts`
- Agregar wildcards `*.myembed.biz`, `*.redeflixapi.store`, `*.playerflix.ink`, `*.watchplay.shop`, `*.superflixapi.quest`, `*.qzz.io`

### 2. `AdBlockWebChromeClient.java`
- Agregar a `isAllowedHost()`: `playerflix.ink`, `watchplay.shop`, `superflixapi.quest`, `reidoscanais.st`, `rdcanais.net`, `qzz.io`

### 3. `AdBlockWebViewClient.java`
- Agregar a `isAllowedHost()`: `qzz.io`

## Verificación
- `npm run build` pasa sin errores
- Compilar APK y probar S11 en Android
