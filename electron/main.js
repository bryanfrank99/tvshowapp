const { app, BrowserWindow, shell, session, Menu } = require('electron');
const path = require('path');
const { initAdBlock, isBlocked, isAllowedHost, isSafeExternalUrl } = require('./adblock');

// Inicializar base de datos de hosts de anuncios
initAdBlock();

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

  app.whenReady().then(createMainWindow);
}

function createMainWindow() {
  const isDev = process.env.NODE_ENV === 'development';
  const targetUrl = process.env.TVSHOW_URL || 'https://tvshowapp-one.vercel.app';

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

  // 3. Control de navegaciones directas de la ventana principal
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

  // 4. Atajos de teclado útiles (F11 para Pantalla Completa, Escape para salir)
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
