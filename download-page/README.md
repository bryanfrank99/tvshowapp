# TVShow - Landing Page de Descargas Locales (Auto-Alojadas)

Página estática independiente (`index.html`) para descargar las aplicaciones oficiales de **TVShow** servidas directamente desde tu propio servidor o dominio, **sin redirecciones ni descargas desde GitHub**.

---

## 📁 Estructura de la Carpeta

Para alojar la página y las aplicaciones en la misma URL, sube esta carpeta a tu servidor con la siguiente estructura:

```text
/ (raíz del sitio o subcarpeta)
│
├── index.html                 <- Página web de descargas
└── apps/                      <- Carpeta con los instaladores
    ├── TVShow-TV.apk          <- Aplicación para Android TV y Firestick
    ├── TVShow-Mobile.apk      <- Aplicación para teléfonos y tablets Android
    └── TVShow-Setup.exe       <- Instalador de escritorio para Windows
```

---

## ⚡ Funcionamiento
1. **Descargas Directas Locales:** Los botones apuntan de forma relativa a `apps/TVShow-...` con el atributo HTML5 `download`, forzando la descarga inmediata desde tu mismo host.
2. **Cálculo Automático de URL:** El código JavaScript resuelve dinámicamente `window.location.origin` y la ruta actual, de modo que la URL de **Downloader** y el **Código QR** siempre apuntan exactamente a la dirección web donde tengas alojada la página (ej: `https://midominio.com/apps/TVShow-Mobile.apk`).
3. **Cero Dependencias de GitHub:** No realiza llamadas a la API de GitHub ni redirecciona a repositorios públicos.
4. **Detección Automática:** Identifica si el visitante usa Windows, Android TV o celular y destaca el instalador adecuado.
5. **Multilingüe:** Selector de idioma en tiempo real (**Español**, **Inglés**, **Portugués**).
