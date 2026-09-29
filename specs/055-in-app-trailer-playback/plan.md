# Plan 055: Reproducción de Tráilers Dentro de la Aplicación

## 1. Arquitectura y Solución

```
+---------------------------------------------------------------------------------+
|                                 TrailerButton.tsx                               |
|       <iframe src="https://www.youtube.com/embed/{videoKey}?autoplay=1..." />   |
+---------------------------------------+-----------------------------------------+
                                        |
                 +----------------------+----------------------+
                 |                                             |
                 v (Windows Electron)                          v (Android Capacitor)
+-----------------------------------+         +-----------------------------------+
| electron/adblock.js               |         | capacitor.config.ts               |
| - ALLOWED_STREAM_HOSTS:           |         | - allowNavigation:                |
|   youtube.com,                    |         |   *.youtube.com,                  |
|   youtube-nocookie.com,           |         |   *.youtube-nocookie.com,         |
|   googlevideo.com                 |         |   *.googlevideo.com               |
+-----------------+-----------------+         +-----------------+-----------------+
                  |                                             |
                  v                                             v
+-----------------------------------+         +-----------------------------------+
| electron/main.js                  |         | AdBlockWebViewClient.java         |
| - will-frame-navigate:            |         | - isAllowedHost():                |
|   if (isAllowedHost(host)) return |         |   youtube.com, googlevideo.com... |
|   (NO secuestrar a navegador ext) |         | - shouldOverrideUrlLoading:       |
| - did-frame-finish-load:          |         |   permite embed in-app            |
|   excluir defusers en youtube     |         +-----------------------------------+
+-----------------+-----------------+
                  |
                  v
       +--------------------+
       |  REPRODUCCIÓN      |
       |  100% IN-APP       |
       +--------------------+
```

## 2. Fases de Implementación

### Fase 1: Configuración de Electron
- **`electron/adblock.js`**:
  - Añadir `youtube.com`, `youtube-nocookie.com` y `googlevideo.com` a `ALLOWED_STREAM_HOSTS`.
- **`electron/main.js`**:
  - En `will-frame-navigate`: Comprobar `if (isAllowedHost(host)) return;` para permitir que el frame cargue en la app.
  - En `did-frame-finish-load`: Omitir inyección de defusers si el host es de YouTube (`!host.includes('youtube') && !host.includes('googlevideo')`).

### Fase 2: Configuración de Android
- **`capacitor.config.ts`**:
  - Añadir `youtube.com`, `*.youtube.com`, `youtube-nocookie.com`, `*.youtube-nocookie.com`, `*.googlevideo.com` a `allowNavigation`.
- **`AdBlockWebViewClient.java`**:
  - Añadir `youtube.com`, `youtube-nocookie.com`, `googlevideo.com`, `ytimg.com` a `isAllowedHost()`.
- **`AdBlockWebChromeClient.java`**:
  - Añadir los mismos hosts a `isAllowedHost()`.

### Fase 3: Componentes de UI y Selección de Tráiler
- **`components/TrailerButton.tsx`**:
  - Añadir parámetros recomendados `playsinline=1` y permisos de iframe `clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share`.
- **`app/title/page.tsx`**:
  - Priorizar videos donde `type === "Trailer"`.

### Fase 4: Pruebas Automatizadas y Verificación
- Crear `scripts/test-trailer-in-app.mjs`:
  - Verificar que `isAllowedHost` reconozca `youtube.com`, `www.youtube.com`, `youtube-nocookie.com`, `googlevideo.com`.
  - Verificar que `electron/main.js` no intercepte sub-frames de hosts permitidos.
  - Verificar que `capacitor.config.ts` contenga los wildcards de YouTube en `allowNavigation`.
  - Verificar que los clientes nativos Android incluyan a YouTube en sus listas de hosts autorizados.
- Ejecutar build de producción y todos los test suites.
