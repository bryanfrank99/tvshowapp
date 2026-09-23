# TVShow - Landing Page de Descargas

Página estática independiente (`index.html`) para la descarga de las aplicaciones oficiales de **TVShow** (Android TV, Firestick, Android Móvil y Windows PC).

## 🚀 Características
- **100% Autónoma:** Un solo archivo HTML con CSS y JavaScript embebidos, sin dependencias de Node.js, librerías pesadas ni frameworks.
- **Detección Automática de Dispositivo:** Identifica si el visitante navega desde Windows, Android TV o celular Android y resalta la descarga recomendada.
- **Sincronización Dinámica con GitHub Releases:** Consulta la API pública de GitHub para obtener automáticamente los nombres, enlaces directos y pesos de la última versión publicada (`/releases/latest`).
- **Multilingüe:** Soporte para Español (`ES`), Inglés (`EN`) y Portugués (`PT`) con persistencia en `localStorage`.
- **Código QR:** Generador dinámico de código QR para escanear con la cámara del celular y descargar el APK directamente.
- **Guía Downloader:** Enlace directo y botón de copiado rápido para la app *Downloader by AFTVnews* en Firestick y Smart TV.

## 📦 Despliegue en URL independiente

Puedes desplegar esta carpeta en cualquier servicio de hosting estático:
- **Cloudflare Pages / Netlify / Vercel:** Selecciona la carpeta y despliega como sitio estático sin comando de build (`Publish directory: .`).
- **GitHub Pages:** Sube los archivos a una rama (ej. `gh-pages`) o activa Pages en la raíz de un nuevo repositorio.
- **Nginx / Apache / Caddy:** Copia el archivo `index.html` en `/var/www/html/` o en tu virtual host.
- **S3 / Firebase Hosting / Surge.sh:** Despliegue directo de archivos estáticos.
