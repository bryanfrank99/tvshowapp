# Spec 051 — S11 EmbedMovies: Reproducción en Android

## Problema
El servidor S11 (EmbedMovies / `myembed.biz`) no reproduce contenido en la app Android.

## Causas Raíz

### 1. Capacitor `allowNavigation` rechaza subdominios
El flujo de reproducción de S11 es:
```
myembed.biz → playerflix.ink → v1.watchplay.shop → v2.watchplay.shop
                                                     ↓
                                              vid*.hclod.qzz.io (CDN HLS)
```

Capacitor usa `HostMask.java` que compara partes del host por igualdad de tamaño:
- `watchplay.shop` (maskSize=2) no matchea `v1.watchplay.shop` (hostSize=3)
- Resultado: Capacitor lanza `Intent.ACTION_VIEW` → navegador externo → fallo silencioso

**Fix:** Usar wildcards explícitos: `*.watchplay.shop`, `*.playerflix.ink`, etc.

### 2. `AdBlockWebChromeClient.java` — Hosts faltantes
La lista `isAllowedHost()` del WebChromeClient estaba desincronizada con la del WebViewClient.
Faltaban: `playerflix.ink`, `watchplay.shop`, `superflixapi.quest`, `reidoscanais.st`, `rdcanais.net`, `qzz.io`

Cuando `playerflix.ink` intenta `window.open()` o crear popups, el ChromeClient los bloquea silenciosamente.

### 3. CDN `qzz.io` no permitido
Los streams HLS provienen de `vid*.hclod.qzz.io` que no estaba en ninguna whitelist.

## Solución
- `capacitor.config.ts`: Agregar wildcards `*.domain` para todos los dominios con subdominios en la cadena de reproducción
- `AdBlockWebChromeClient.java`: Sincronizar `isAllowedHost()` con los hosts del WebViewClient + agregar `qzz.io`
- `AdBlockWebViewClient.java`: Agregar `qzz.io` a la lista de hosts permitidos
