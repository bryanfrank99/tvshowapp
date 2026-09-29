# Spec 055: Reproducción de Tráilers Dentro de la Aplicación

## 1. Contexto y Problema
En TVShow, los usuarios pueden visualizar tráilers de películas y series en la página de información ([`app/title/page.tsx`](file:///C:/Users/Administrator/.gemini/antigravity/scratch/tvshowapp/app/title/page.tsx)) mediante el componente [`components/TrailerButton.tsx`](file:///C:/Users/Administrator/.gemini/antigravity/scratch/tvshowapp/components/TrailerButton.tsx), el cual despliega un reproductor `<iframe>` de YouTube incrustado.

Actualmente los tráilers no se reproducen dentro de la aplicación:
1. **En Electron (Windows)**:
   - El evento `will-frame-navigate` en [`electron/main.js`](file:///C:/Users/Administrator/.gemini/antigravity/scratch/tvshowapp/electron/main.js) intercepta la carga del iframe de YouTube al considerarlo `isSafeExternalUrl(url)`, cancela la carga interna con `event.preventDefault()` y fuerza su apertura en el navegador externo del sistema con `shell.openExternal(url)`.
   - `youtube.com` y `youtube-nocookie.com` no estaban incluidos en `ALLOWED_STREAM_HOSTS` de [`electron/adblock.js`](file:///C:/Users/Administrator/.gemini/antigravity/scratch/tvshowapp/electron/adblock.js).
2. **En Android (Capacitor / Smart TV)**:
   - [`capacitor.config.ts`](file:///C:/Users/Administrator/.gemini/antigravity/scratch/tvshowapp/capacitor.config.ts) no incluye `*.youtube.com` ni `*.youtube-nocookie.com` en `allowNavigation`, provocando que Capacitor lo interprete como navegación externa y dispare un `Intent.ACTION_VIEW` al navegador externo.
   - [`AdBlockWebViewClient.java`](file:///C:/Users/Administrator/.gemini/antigravity/scratch/tvshowapp/android/app/src/main/java/com/tvshow/app/AdBlockWebViewClient.java) y [`AdBlockWebChromeClient.java`](file:///C:/Users/Administrator/.gemini/antigravity/scratch/tvshowapp/android/app/src/main/java/com/tvshow/app/AdBlockWebChromeClient.java) no tenían a YouTube en `isAllowedHost()`, bloqueando o cancelando su carga en el WebView.

## 2. Requerimientos Funcionales

### A. Soporte en Electron (Windows)
1. **Permitir dominios de YouTube en `ALLOWED_STREAM_HOSTS`**:
   - Agregar `youtube.com`, `youtube-nocookie.com` y `googlevideo.com` a [`electron/adblock.js`](file:///C:/Users/Administrator/.gemini/antigravity/scratch/tvshowapp/electron/adblock.js).
2. **Evitar secuestro de sub-frames en `will-frame-navigate`**:
   - En [`electron/main.js`](file:///C:/Users/Administrator/.gemini/antigravity/scratch/tvshowapp/electron/main.js), antes de evaluar `isSafeExternalUrl(url)` en un sub-frame, comprobar si `isAllowedHost(host)`. Si el host del frame está permitido (ej. embed de YouTube o player de video), permitir que cargue dentro del frame sin abrir navegador externo.
3. **Excluir YouTube de los defusers de ads**:
   - En `did-frame-finish-load`, asegurar que la inyección de defusers solo se aplique a reproductores de terceros y no a YouTube (`!host.includes('youtube')`), evitando interferir con el funcionamiento de los controles de YouTube.

### B. Soporte en Android (Capacitor & WebViews)
1. **Configuración de Capacitor (`capacitor.config.ts`)**:
   - Añadir `youtube.com`, `*.youtube.com`, `youtube-nocookie.com`, `*.youtube-nocookie.com`, `*.googlevideo.com` a `allowNavigation`.
2. **Lista blanca en Clientes WebView**:
   - En `AdBlockWebViewClient.java` y `AdBlockWebChromeClient.java`, incluir `youtube.com`, `youtube-nocookie.com`, `googlevideo.com`, `ytimg.com` en `isAllowedHost()`.

### C. Componente de Tráiler (`components/TrailerButton.tsx`)
1. Configurar atributos completos de iframe:
   - `allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"`
   - `allowFullScreen`
   - Parámetros URL: `autoplay=1&rel=0&playsinline=1&enablejsapi=1`
2. Priorizar en [`app/title/page.tsx`](file:///C:/Users/Administrator/.gemini/antigravity/scratch/tvshowapp/app/title/page.tsx) los videos cuyo `type === "Trailer"` sobre clips secundarios o teasers.

## 3. Criterios de Aceptación
1. Al presionar "Reproducir tráiler" en la ficha de cualquier título, el video se reproduce inmediatamente incrustado dentro de la aplicación.
2. En Windows (Electron), el tráiler no abre ventanas de Chrome, Edge ni ningún navegador externo; se reproduce 100% in-app.
3. En Android, el tráiler no abre aplicaciones externas y se muestra dentro del modal del reproductor.
4. Los botones de cerrar tráiler (o tecla Escape / botón Atrás en TV) cierran el tráiler y devuelven el foco a la ficha.
5. Los bloqueadores de anuncios continúan operando normalmente en servidores de terceros sin afectar los tráilers.
