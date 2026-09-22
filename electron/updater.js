const { app } = require('electron');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { spawn } = require('child_process');

class DesktopUpdater {
  constructor() {
    this.status = 'idle'; // idle | downloading | completed | error
    this.progress = 0;
    this.bytesDownloaded = 0;
    this.totalBytes = 0;
    this.errorMessage = '';
    this.downloadedFilePath = null;
    this.currentReq = null;
  }

  getAppVersion() {
    try {
      const v = app.getVersion();
      const parts = String(v).split('.');
      return parts.length >= 2 ? `${parts[0]}.${parts[1]}` : (v || '6.17');
    } catch {
      try {
        const pkg = require('../package.json');
        const parts = String(pkg.version).split('.');
        return parts.length >= 2 ? `${parts[0]}.${parts[1]}` : '6.17';
      } catch {
        return '6.17';
      }
    }
  }

  getStatus() {
    return {
      status: this.status,
      progress: this.progress,
      bytesDownloaded: this.bytesDownloaded,
      totalBytes: this.totalBytes,
      error: this.errorMessage || ''
    };
  }

  canInstallPackages() {
    return true;
  }

  openInstallSettings() {
    // En Windows no se requiere pantalla especial de permisos para instalar ejecutables de usuario
  }

  startDownload(downloadUrl) {
    if (this.status === 'downloading') {
      return;
    }

    if (!downloadUrl) {
      this.status = 'error';
      this.errorMessage = 'URL de descarga inválida';
      return;
    }

    this.status = 'downloading';
    this.progress = 0;
    this.bytesDownloaded = 0;
    this.totalBytes = 0;
    this.errorMessage = '';

    const tempDir = app.getPath('temp');
    const targetFile = path.join(tempDir, 'TVShow-Setup-update.exe');

    try {
      if (fs.existsSync(targetFile)) {
        fs.unlinkSync(targetFile);
      }
    } catch (e) {
      console.warn('[DesktopUpdater] No se pudo eliminar instalador anterior:', e.message);
    }

    this.downloadWithRedirects(downloadUrl, targetFile, 0);
  }

  downloadWithRedirects(currentUrl, targetFile, redirectCount) {
    if (redirectCount > 10) {
      this.status = 'error';
      this.errorMessage = 'Demasiadas redirecciones al descargar la actualización';
      return;
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(currentUrl);
    } catch (e) {
      this.status = 'error';
      this.errorMessage = 'URL malformada: ' + e.message;
      return;
    }

    const client = parsedUrl.protocol === 'http:' ? http : https;
    const options = {
      headers: {
        'User-Agent': 'TVShow-DesktopUpdater/' + this.getAppVersion(),
        'Accept': '*/*'
      }
    };

    const req = client.get(currentUrl, options, (res) => {
      // Manejo de redirecciones HTTP 301, 302, 303, 307, 308 (muy común en GitHub Releases / AWS S3)
      if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
        const redirectUrl = res.headers.location;
        if (!redirectUrl) {
          this.status = 'error';
          this.errorMessage = 'Redirección sin cabecera Location';
          return;
        }
        res.resume(); // Consumir respuesta para liberar socket
        return this.downloadWithRedirects(redirectUrl, targetFile, redirectCount + 1);
      }

      if (res.statusCode !== 200) {
        this.status = 'error';
        this.errorMessage = `Error del servidor HTTP ${res.statusCode}`;
        res.resume();
        return;
      }

      const contentLength = res.headers['content-length'];
      if (contentLength) {
        this.totalBytes = parseInt(contentLength, 10) || 0;
      }

      const fileStream = fs.createWriteStream(targetFile);

      res.on('data', (chunk) => {
        this.bytesDownloaded += chunk.length;
        if (this.totalBytes > 0) {
          this.progress = Math.min(100, Math.floor((this.bytesDownloaded * 100) / this.totalBytes));
        }
      });

      res.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close(() => {
          this.downloadedFilePath = targetFile;
          this.progress = 100;
          this.status = 'completed';
          console.log('[DesktopUpdater] Descarga completada exitosamente:', targetFile);
        });
      });

      fileStream.on('error', (err) => {
        fs.unlink(targetFile, () => {});
        this.status = 'error';
        this.errorMessage = 'Error al escribir el archivo: ' + err.message;
      });
    });

    req.on('error', (err) => {
      this.status = 'error';
      this.errorMessage = 'Error de red: ' + err.message;
    });

    this.currentReq = req;
  }

  installUpdate() {
    if (!this.downloadedFilePath || !fs.existsSync(this.downloadedFilePath)) {
      this.status = 'error';
      this.errorMessage = 'El archivo de instalación no existe';
      return;
    }

    try {
      console.log('[DesktopUpdater] Ejecutando instalador:', this.downloadedFilePath);

      // Ejecutar el instalador de Windows desacoplado del proceso actual
      const child = spawn(this.downloadedFilePath, [], {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();

      // Cerrar la aplicación actual para permitir la sobreescritura de archivos
      setTimeout(() => {
        app.quit();
      }, 500);
    } catch (err) {
      this.status = 'error';
      this.errorMessage = 'No se pudo iniciar el instalador: ' + err.message;
    }
  }
}

const desktopUpdater = new DesktopUpdater();

module.exports = {
  desktopUpdater
};
