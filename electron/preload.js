const { contextBridge, ipcRenderer } = require('electron');

// Puente nativo de actualización para Windows Desktop (compatible 1:1 con AndroidUpdater)
const desktopUpdater = {
  getAppVersion: () => {
    try {
      return ipcRenderer.sendSync('desktop-updater:get-version-sync') || '6.17';
    } catch {
      return '6.17';
    }
  },
  getPlatform: () => 'windows',
  canInstallPackages: () => true,
  openInstallSettings: () => {},
  startDownload: (url) => {
    ipcRenderer.send('desktop-updater:start-download', url);
  },
  getStatus: () => {
    try {
      return ipcRenderer.sendSync('desktop-updater:get-status-sync') || {
        status: 'idle',
        progress: 0,
        bytesDownloaded: 0,
        totalBytes: 0,
        error: ''
      };
    } catch (e) {
      return { status: 'error', progress: 0, error: e.message };
    }
  },
  installUpdate: () => {
    ipcRenderer.send('desktop-updater:install');
  },
  installApk: () => {
    // Alias para máxima compatibilidad polimórfica con AppUpdater.tsx
    ipcRenderer.send('desktop-updater:install');
  }
};

// Exponer en window para que AppUpdater.tsx lo reconozca de inmediato
contextBridge.exposeInMainWorld('DesktopUpdater', desktopUpdater);
contextBridge.exposeInMainWorld('WindowsUpdater', desktopUpdater);

// Exponer en electronAPI
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  version: process.env.npm_package_version || '6.17',
  updater: desktopUpdater
});
