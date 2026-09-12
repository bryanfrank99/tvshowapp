package com.tvshow.app;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.Settings;
import android.webkit.JavascriptInterface;
import androidx.core.content.FileProvider;
import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class AppUpdaterBridge {
    private final Context context;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    private volatile String status = "idle"; // idle, downloading, completed, error
    private volatile int progress = 0; // 0..100
    private volatile long bytesDownloaded = 0;
    private volatile long totalBytes = 0;
    private volatile String errorMessage = "";
    private volatile File downloadedApkFile = null;

    public AppUpdaterBridge(Context context) {
        this.context = context.getApplicationContext();
    }

    @JavascriptInterface
    public String getAppVersion() {
        try {
            PackageInfo pInfo = context.getPackageManager().getPackageInfo(context.getPackageName(), 0);
            return pInfo.versionName != null ? pInfo.versionName : "1.0.0";
        } catch (Exception e) {
            return "1.0.0";
        }
    }

    @JavascriptInterface
    public int getAppVersionCode() {
        try {
            PackageInfo pInfo = context.getPackageManager().getPackageInfo(context.getPackageName(), 0);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                return (int) pInfo.getLongVersionCode();
            } else {
                return pInfo.versionCode;
            }
        } catch (Exception e) {
            return 1;
        }
    }

    @JavascriptInterface
    public String getStatus() {
        try {
            JSONObject json = new JSONObject();
            json.put("status", status);
            json.put("progress", progress);
            json.put("bytesDownloaded", bytesDownloaded);
            json.put("totalBytes", totalBytes);
            json.put("error", errorMessage != null ? errorMessage : "");
            return json.toString();
        } catch (Exception e) {
            return "{\"status\":\"error\",\"progress\":0,\"error\":\"" + e.getMessage() + "\"}";
        }
    }

    @JavascriptInterface
    public boolean canInstallPackages() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            return context.getPackageManager().canRequestPackageInstalls();
        }
        return true;
    }

    @JavascriptInterface
    public void openInstallSettings() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
                intent.setData(Uri.parse("package:" + context.getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
            }
        } catch (Exception ignored) {}
    }

    @JavascriptInterface
    public void startDownload(final String apkUrl) {
        if ("downloading".equals(status)) {
            return;
        }

        status = "downloading";
        progress = 0;
        bytesDownloaded = 0;
        totalBytes = 0;
        errorMessage = "";

        executor.execute(() -> {
            HttpURLConnection conn = null;
            InputStream is = null;
            FileOutputStream fos = null;
            try {
                String currentUrl = apkUrl;
                int redirectCount = 0;

                while (redirectCount < 10) {
                    URL url = new URL(currentUrl);
                    conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestProperty("User-Agent", "TVShow-AutoUpdater/" + getAppVersion());
                    conn.setConnectTimeout(25000);
                    conn.setReadTimeout(40000);
                    conn.setInstanceFollowRedirects(true);

                    int responseCode = conn.getResponseCode();
                    if (responseCode == HttpURLConnection.HTTP_MOVED_PERM
                            || responseCode == HttpURLConnection.HTTP_MOVED_TEMP
                            || responseCode == 307
                            || responseCode == 308) {
                        String newUrl = conn.getHeaderField("Location");
                        if (newUrl != null && !newUrl.isEmpty()) {
                            currentUrl = newUrl;
                            redirectCount++;
                            conn.disconnect();
                            continue;
                        }
                    }

                    if (responseCode != HttpURLConnection.HTTP_OK) {
                        throw new Exception("HTTP " + responseCode + " al descargar APK");
                    }
                    break;
                }

                if (conn == null) {
                    throw new Exception("No fue posible conectar con el servidor");
                }

                totalBytes = conn.getContentLengthLong();

                File dir = context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                if (dir == null) {
                    dir = context.getCacheDir();
                }
                if (!dir.exists()) {
                    dir.mkdirs();
                }

                File apkFile = new File(dir, "TVShow-update.apk");
                if (apkFile.exists()) {
                    apkFile.delete();
                }

                is = conn.getInputStream();
                fos = new FileOutputStream(apkFile);
                byte[] buffer = new byte[32768];
                int len;
                bytesDownloaded = 0;

                while ((len = is.read(buffer)) != -1) {
                    fos.write(buffer, 0, len);
                    bytesDownloaded += len;
                    if (totalBytes > 0) {
                        progress = (int) ((bytesDownloaded * 100) / totalBytes);
                    }
                }

                fos.flush();
                downloadedApkFile = apkFile;
                progress = 100;
                status = "completed";

                // Inicia la instalación automáticamente al terminar la descarga
                installApk();
            } catch (Exception e) {
                status = "error";
                errorMessage = e.getMessage() != null ? e.getMessage() : "Error en la descarga";
            } finally {
                try { if (fos != null) fos.close(); } catch (Exception ignored) {}
                try { if (is != null) is.close(); } catch (Exception ignored) {}
                try { if (conn != null) conn.disconnect(); } catch (Exception ignored) {}
            }
        });
    }

    @JavascriptInterface
    public void installApk() {
        try {
            if (downloadedApkFile == null || !downloadedApkFile.exists()) {
                status = "error";
                errorMessage = "El archivo APK no existe o no se ha descargado";
                return;
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                if (!context.getPackageManager().canRequestPackageInstalls()) {
                    Intent settingsIntent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
                    settingsIntent.setData(Uri.parse("package:" + context.getPackageName()));
                    settingsIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(settingsIntent);
                    return;
                }
            }

            Uri apkUri = FileProvider.getUriForFile(
                    context,
                    context.getPackageName() + ".fileprovider",
                    downloadedApkFile
            );

            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            context.startActivity(intent);
        } catch (Exception e) {
            status = "error";
            errorMessage = "Error al abrir instalador: " + e.getMessage();
        }
    }
}
