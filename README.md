# TVShow — Plataforma Multiplataforma de Streaming & Catálogo

> **Versión Actual:** `v7.1` · **Arquitectura:** Next.js 14 + Electron (Chromium) + Capacitor (Android Mobile & TV) + Supabase

Plataforma integral de streaming y catálogo audiovisual para películas, series y canales de televisión en vivo. Indexa metadatos y reproduce contenidos a través de una arquitectura desacoplada multi-proveedor con resolución en servidor, fallback automático, bloqueo avanzado de publicidad con **uBlock Origin Lite**, y sistema de actualización automática en todas las plataformas nativas.

No aloja contenido de video en servidores propios: indexa identificadores y metadatos (TMDB / IMDb) y reproduce a través de proveedores y streams configurables.

---

## 📱 Ecosistema Multiplataforma

TVShow está disponible como aplicación web responsive y como aplicaciones nativas optimizadas:

| Plataforma | Binario / Formato | Características Clave |
| :--- | :--- | :--- |
| 💻 **Windows Desktop** | `TVShow-Setup-vX.Y.exe` (NSIS) | Motor Chromium + Node.js (Electron). Incluye **uBlock Origin Lite** por defecto, bloqueo de popups a nivel de socket de red y auto-actualizador silencioso. |
| 📱 **Android Mobile** | `TVShow-Mobile-vX.Y.apk` | Interfaz táctil adaptada para smartphones y tablets. Gestor de descargas y actualización en la app. |
| 📺 **Android TV / Google TV** | `TVShow-TV-vX.Y.apk` | Interfaz cinemática con navegación 100% mediante control remoto (D-Pad), foco accesible y banner para Android TV Leanback. |
| 🌐 **Web / PWA** | Despliegue en Vercel | Modo standalone responsive, caché instantánea y acceso universal. |

---

## 🚀 Novedades Principales

1. **Arquitectura Desacoplada Provider $\rightarrow$ Resolver $\rightarrow$ Sources $\rightarrow$ Player:**
   - **Resolver Centralizado ([`/api/resolve`](file:///C:/Users/Administrator/.gemini/antigravity/scratch/tvshowapp/app/api/resolve)):** Inyección segura de credenciales en servidor, conversión automática IMDb $\leftrightarrow$ TMDB y puntuación por afinidad de idioma.
   - **Identificadores Persistentes (`S1` .. `S14`):** Cada servidor conserva un ID canónico (#id) idéntico entre el panel de administración y el reproductor para facilitar diagnósticos y reportes.
   - **Motor de Fallback Automático:** Si una fuente experimenta problemas o caída de stream, el reproductor conmuta de inmediato a la siguiente fuente recomendada.
   - **Monitoreo de Salud:** Diagnóstico en tiempo real y KPIs de disponibilidad en `/admin`.

2. **Bloqueo Nativo de Anuncios + uBlock Origin Lite (Windows):**
   - **uBlock Origin Lite (Manifest V3):** Extensión oficial preinstalada y activa en el motor Chromium de Electron con reglas declarativas DNR (`declarative_net_request`), EasyList y EasyPrivacy.
   - **Cancelación en Socket de Red:** Más de 190 dominios de publicidad y rastreo bloqueados a nivel de socket (`session.webRequest`).
   - **Neutralización de Popups y Redirecciones:** `setWindowOpenHandler` deniega popups y `will-frame-navigate` impide redirecciones maliciosas dentro de los iframes.

3. **Sistema de Actualización Automática Integrado:**
   - Detección transparente de nuevas versiones vía `/api/app/version`.
   - Modal unificado con cuenta regresiva de 5 segundos, notas de la versión y barra de progreso.
   - Descarga e instalación directa de APKs en Android y del instalador `.exe` en Windows.

4. **Gestión de Acceso y Facturación:**
   - Paquetes de acceso de 30 días (10 USD) con tarifa diaria calculada.
   - Prueba gratuita automática de 3 días para nuevos códigos de usuario.
   - Extensiones de tiempo acumulativas (+30d, +90d, +360d).
   - Generación de códigos permanentes (Lifetime) exclusivos para administradores.

---

## 🛠️ Requisitos e Instalación

### Requisitos
- **Node.js:** Versión 22 o superior (definida en `package.json:engines`).
- **NPM:** 10 o superior.
- **Android SDK / Java 21:** Requerido únicamente para compilación local de APKs.

### Puesta en Marcha Local

```bash
# 1. Clonar el repositorio
git clone https://github.com/bryanfrank99/tvshowapp.git
cd tvshowapp

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local

# 4. Iniciar servidor de desarrollo web
npm run dev
# Acceder en http://localhost:3000

# 5. Ejecutar la app de escritorio en desarrollo (Windows)
npm run electron:dev
```

---

## ⚙️ Variables de Entorno (`.env.local`)

| Variable | Requerida | Descripción |
| :--- | :---: | :--- |
| `SUPABASE_URL` | Sí | URL del proyecto Supabase (gestión de usuarios, códigos, sesiones y servidores). |
| `SUPABASE_SERVICE_KEY` | Sí | Clave de servicio de Supabase (`service_role`, exclusiva de servidor). |
| `ADMIN_PASSWORD` | Sí | Contraseña para el acceso al panel `/admin`. |
| `TMDB_API_KEY` | Recomendada | API Key de themoviedb.org para catálogo extendido e imágenes en alta resolución. |
| `VIMEUS_VIEW_KEY` | Condicional | Clave privada para reproductor Vimeus (inyección en servidor). |
| `TVSHOW_URL` | No | URL del frontend web remoto que carga la ventana de Electron (por defecto apunta a Vercel). |
| `PROVIDERS_SOURCE` | No | Asignar a `local` para forzar la lectura de `public/providers.json` en lugar de Supabase durante pruebas locales. |

---

## 📜 Comandos y Scripts del Proyecto

### Desarrollo y Pruebas
- `npm run dev` — Inicia el entorno de desarrollo Next.js en `http://localhost:3000`.
- `npm run build` — Compila la aplicación web para producción.
- `npm run start` — Inicia el servidor de producción Next.js.
- `npm run lint` — Ejecuta el análisis estático de código.
- `npm run test:sources` — Ejecuta la suite completa de pruebas de servidores e integración (Fases 1 a 5).
- `npm run test:phase1` — Prueba adaptadores, interpolación de marcadores y detección de streams.
- `npm run test:phase2` — Prueba resolución centralizada, mapeo IMDb/TMDB y estabilidad de IDs canónicos.
- `npm run test:phase3-4` — Prueba motor de fallback y ciclo de selección en player.
- `npm run test:phase5` — Prueba health checks y cálculo de KPIs.

### Aplicación de Escritorio Windows (Electron)
- `npm run electron:dev` — Inicia la ventana nativa de Electron en modo desarrollo con Chromium.
- `npm run electron:pack` — Empaqueta los archivos de Windows en `dist/win-unpacked` para pruebas locales.
- `npm run electron:dist` — Genera el instalador instalable NSIS `TVShow-Setup-*.exe` en `dist/`.

### Aplicaciones Android (Capacitor + Gradle)
- `npm run build:apk:mobile` — Compila el APK para Smartphones/Tablets (`android/app/build/outputs/apk/mobile/debug/`).
- `npm run build:apk:tv` — Compila el APK para Android TV (`android/app/build/outputs/apk/tv/debug/`).
- `npm run build:apks` — Compila ambos sabores simultáneamente.

---

## 🔄 Sistema de Versionado y Publicación CI/CD

El repositorio cuenta con un sistema de versionado automatizado y estandarizado:

### Incremento Automático por Commit
- Cada `git commit` ejecutado incrementa automáticamente el segundo dígito de la versión (`v7.0` $\rightarrow$ `v7.1` $\rightarrow$ `v7.2`...) mediante el hook de pre-commit ([`.husky/pre-commit`](file:///C:/Users/Administrator/.gemini/antigravity/scratch/tvshowapp/.husky/pre-commit) $\rightarrow$ [`scripts/bump-version.mjs`](file:///C:/Users/Administrator/.gemini/antigravity/scratch/tvshowapp/scripts/bump-version.mjs)).
- En [`package.json`](file:///C:/Users/Administrator/.gemini/antigravity/scratch/tvshowapp/package.json) se mantiene el estándar SemVer estricto (`7.X.0`) para compatibilidad plena con `electron-builder`.
- En la interfaz y tags se visualiza limpiamente como **`vX.Y`**.
- Para realizar un commit administrativo sin incrementar la versión:
  ```bash
  SKIP_VERSION=1 git commit -m "docs: actualizar documentacion"
  ```

### Publicación de Releases en GitHub Actions
Para publicar una nueva versión oficial y generar automáticamente los 3 instaladores binarios en la nube:

```bash
npm run release
```

Este comando:
1. Sincroniza la rama `main` con GitHub.
2. Crea el tag oficial de Git (ej: `v7.1`).
3. Envía el tag a GitHub, activando el workflow [`.github/workflows/release.yml`](file:///C:/Users/Administrator/.gemini/antigravity/scratch/tvshowapp/.github/workflows/release.yml).
4. GitHub Actions compila en paralelo:
   - 📱 **TVShow Mobile** (`TVShow-Mobile-vX.Y.apk`)
   - 📺 **TVShow TV** (`TVShow-TV-vX.Y.apk`)
   - 💻 **TVShow Windows** (`TVShow-Setup-vX.Y.exe` con uBlock Origin Lite)
5. Publica automáticamente el Release en [GitHub Releases](https://github.com/bryanfrank99/tvshowapp/releases) con los activos listos para su descarga y consumidos por el sistema de auto-actualización.

---

## 📄 Licencia y Descargo de Responsabilidad

Este proyecto es únicamente para fines educativos y de investigación. La aplicación no aloja, retransmite ni almacena archivos audiovisuales en sus servidores. Todos los reproductores e imágenes son cargados desde fuentes externas de terceros proporcionadas por las URLs configuradas.
