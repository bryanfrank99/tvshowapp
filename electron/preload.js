const { contextBridge } = require('electron');

// Exponer de forma segura variables de entorno de plataforma a la app web
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  version: process.env.npm_package_version || '6.15'
});
