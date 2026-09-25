# Spec: App de Escritorio Windows con Electron + Bloqueo Nativo de Anuncios

## Contexto
Actualmente, TVShow cuenta con versión web en producción (`https://tvshowapp.net`) y binario móvil para Android con bloqueo nativo de popups en WebView (`AdBlockWebViewClient`). Los usuarios de Windows que consumen streaming en pantalla de escritorio o TV conectada requieren una aplicación nativa instalable (`.exe`) que proporcione una experiencia inmersiva, sin barras de navegación de navegadores comerciales, con soporte de pantalla completa, rendimiento acelerado por hardware y bloqueo estricto de ventanas emergentes (popups), redirecciones y redes de anuncios intrusivas que intentan disparar los reproductores embed de terceros.

Siguiendo la misma filosofía de Android (Opción A: Shell nativo sobre URL de producción), la app de escritorio no requiere duplicar el código web ni refactorizar rutas, manteniendo al 100% la compatibilidad con proxies, APIs y la actualización automática en cada despliegue.

## Objetivos
- [ ] Crear un shell nativo con Electron en el directorio `electron/` configurado para cargar la URL de producción (`https://tvshowapp.net` o variable de entorno configurable).
- [ ] Implementar bloqueo total de popups (`setWindowOpenHandler` denegando intentos no autorizados de `window.open` o `target="_blank"` generados desde iframes).
- [ ] Abrir enlaces externos legítimos (ej. trailers de YouTube, perfiles IMDb, TMDB) en el navegador web predeterminado del sistema operativo mediante `shell.openExternal`.
- [ ] Implementar interceptor de red a nivel de sesión (`session.defaultSession.webRequest.onBeforeRequest`) contra la lista de dominios de publicidad (`adhosts.txt`).
- [ ] Soporte para pantalla completa fluida (teclas F11 y Escape) y tema oscuro nativo integrado (`#0b0d14`).
- [ ] Añadir scripts de ejecución en desarrollo (`npm run electron:dev`) y empaquetado para Windows (`npm run electron:dist` generando instalador NSIS y versión portable).
- [ ] Garantizar que las dependencias de Electron no afecten el build web ni el pipeline de despliegue en Vercel.

## No objetivos
- No exportar la web a HTML estático ni duplicar rutas Next.js.
- No publicar en Microsoft Store.
- No soporte offline (el streaming de video depende de conexión activa).

## Criterios de aceptación
- [ ] `npm run electron:dev` levanta la ventana de Windows cargando TVShow con fondo oscuro e ícono oficial.
- [ ] Al reproducir contenido en servidores con anuncios (ej. VidCore, Vimeus, Vidzee), las ventanas emergentes (popups) y redirecciones no autorizadas son bloqueadas.
- [ ] Peticiones de red a dominios en `adhosts.txt` son canceladas.
- [ ] `npm run build` de Next.js se mantiene limpio y sin errores.
- [ ] El comando de empaquetado genera los artefactos ejecutables (`.exe`) en `dist/`.

## Restricciones
- Constitución aplicable: 3 (Build verde o no existe), 5 (Proveedores remotos sin hardcodeo), 8 (Sin hosting de video).
- Todo el código de escritorio debe ser FOSS y vivir en `electron/`.
