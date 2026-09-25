const { app, BrowserWindow, shell, session, Menu, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { initAdBlock, isBlocked, isAllowedHost, isSafeExternalUrl } = require('./adblock');
const { desktopUpdater } = require('./updater');

// Inicializar base de datos de hosts de anuncios
initAdBlock();

// Habilitar características de extensiones Manifest V3 en Chromium
app.commandLine.appendSwitch('enable-features', 'ExtensionManifestV3,ExtensionServiceWorker');

// Carga automática de extensiones Chromium por defecto (uBlock Origin Lite)
async function loadDefaultExtensions() {
  try {
    let extPath;
    if (app.isPackaged) {
      extPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'electron', 'extensions', 'ubol');
    } else {
      extPath = path.join(__dirname, 'extensions', 'ubol');
    }

    if (fs.existsSync(extPath)) {
      const loader = session.defaultSession.extensions
        ? session.defaultSession.extensions.loadExtension.bind(session.defaultSession.extensions)
        : session.defaultSession.loadExtension.bind(session.defaultSession);
      const ext = await loader(extPath, {
        allowFileAccess: true
      });
      console.log(`[Extension] Cargada con éxito: ${ext.name} (v${ext.version})`);
    } else {
      console.warn('[Extension] No se encontró el directorio de uBlock Origin Lite:', extPath);
    }
  } catch (err) {
    console.error('[Extension] Error cargando uBlock Origin Lite:', err);
  }
}

// Canales IPC para el sistema de actualización automática en Windows
ipcMain.on('desktop-updater:get-version-sync', (event) => {
  event.returnValue = desktopUpdater.getAppVersion();
});

ipcMain.on('desktop-updater:get-status-sync', (event) => {
  event.returnValue = desktopUpdater.getStatus();
});

ipcMain.on('desktop-updater:start-download', (event, url) => {
  desktopUpdater.startDownload(url);
});

ipcMain.on('desktop-updater:install', () => {
  desktopUpdater.installUpdate();
});

// Garantizar instancia única
const gotTheLock = app.requestSingleInstanceLock();
let mainWindow = null;

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    await loadDefaultExtensions();
    createMainWindow();
  });
}

function createMainWindow() {
  const isDev = process.env.NODE_ENV === 'development';
  const targetUrl = process.env.TVSHOW_URL || 'https://tvshowapp.net';

  // Configuración de la ventana principal
  const iconPath = path.join(__dirname, '../resources/icon.png');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 760,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: '#0b0d14',
    title: 'TVShow',
    icon: iconPath,
    autoHideMenuBar: true,
    show: false, // Esperar a 'ready-to-show' para evitar parpadeos
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      spellcheck: false
    }
  });

  // Ocultar menú superior para una experiencia cinemática
  Menu.setApplicationMenu(null);

  // 1. Interceptor de ventanas emergentes (Popups y enlaces target="_blank")
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Si es un enlace seguro externo (ej. trailers de YouTube, IMDb, TMDB), abrir en navegador del sistema
    if (isSafeExternalUrl(url)) {
      shell.openExternal(url).catch(() => {});
      return { action: 'deny' };
    }

    // Cualquier popup lanzado por iframes o anuncios de video es bloqueado inmediatamente
    console.log('[AdBlock] Popup interceptado y bloqueado:', url);
    return { action: 'deny' };
  });

  // 2. Interceptor de solicitudes de red para filtrar anuncios y rastreadores
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    const url = details.url;
    if (isBlocked(url)) {
      // Bloquear recurso de publicidad
      return callback({ cancel: true });
    }
    return callback({ cancel: false });
  });

  // 3. Control de navegaciones directas de la ventana principal (will-navigate)
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    try {
      const parsed = new URL(navigationUrl);
      const host = parsed.hostname;

      // Si es parte de la app o servidor de streaming permitido, continuar
      if (isAllowedHost(host)) {
        return;
      }

      // Si es un enlace externo seguro, abrir en navegador y cancelar navegación interna
      if (isSafeExternalUrl(navigationUrl)) {
        event.preventDefault();
        shell.openExternal(navigationUrl).catch(() => {});
        return;
      }

      // Si es un intento de redirección no deseado de un iframe/host extraño, cancelarlo
      if (isBlocked(navigationUrl)) {
        event.preventDefault();
        console.log('[AdBlock] Redirección no deseada bloqueada:', navigationUrl);
      }
    } catch {
      // Si la URL es inválida, ignorar
    }
  });

  // 4. Interceptor de navegación dentro de iframes (will-frame-navigate)
  mainWindow.webContents.on('will-frame-navigate', (event) => {
    const url = event.url;
    if (isBlocked(url)) {
      event.preventDefault();
      console.log('[AdBlock] Navegación de frame bloqueada a host de anuncios:', url);
      return;
    }
    if (!event.isMainFrame) {
      try {
        const parsed = new URL(url);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
          if (isSafeExternalUrl(url)) {
            event.preventDefault();
            shell.openExternal(url).catch(() => {});
          } else if (isBlocked(url)) {
            event.preventDefault();
          }
        }
      } catch {}
    }
  });

  // 5. Neutralizar scripts de popunders y popups en sub-frames al finalizar la carga
  mainWindow.webContents.on('did-frame-finish-load', (event, isMainFrame, frameProcessId, frameRoutingId) => {
    if (!isMainFrame) {
      try {
        if (typeof mainWindow.webContents.executeJavaScriptInFrame === 'function') {
          mainWindow.webContents.executeJavaScriptInFrame(
            [frameProcessId, frameRoutingId],
            `try {
              window.open = function() { console.log('[AdBlock] window.open bloqueado dentro de iframe'); return null; };
              window.alert = function() { return null; };
              window.confirm = function() { return false; };
            } catch(e) {}`
          ).catch(() => {});
        }
      } catch {}
    }
  });

  // 6. Atajos de teclado útiles (F11 para Pantalla Completa, Escape para salir)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F11' && input.type === 'keyDown') {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
      event.preventDefault();
    } else if (input.key === 'Escape' && input.type === 'keyDown' && mainWindow.isFullScreen()) {
      mainWindow.setFullScreen(false);
      event.preventDefault();
    } else if (input.key === 'F12' && input.type === 'keyDown' && isDev) {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  // Mostrar la ventana suavemente una vez lista
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Cargar aplicación
  mainWindow.loadURL(targetUrl);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});
