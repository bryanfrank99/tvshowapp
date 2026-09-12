package com.tvshow.app;

import android.os.Build;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static String getDefaultKey(android.content.Context ctx) {
        if (ctx == null) return "";
        try (java.io.BufferedReader br = new java.io.BufferedReader(
                new java.io.InputStreamReader(ctx.getAssets().open("default_key.txt")))) {
            String line = br.readLine();
            if (line != null) return line.trim();
        } catch (Exception ignored) {}
        return "";
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        AdBlock.initIfNeeded(this);
        try {
            WebView webView = getBridge().getWebView();
            String defaultKey = getDefaultKey(this);

            // Marca UA para que la web active el modo TV (sin barra móvil) y opcionalmente lleve la Key embebida
            String ua = webView.getSettings().getUserAgentString();
            StringBuilder newUa = new StringBuilder(ua != null ? ua : "");
            if (!newUa.toString().contains("TVShowTV")) {
                newUa.append(" TVShowTV");
            }
            if (defaultKey != null && !defaultKey.isEmpty() && !newUa.toString().contains("TVKey/")) {
                newUa.append(" TVKey/").append(defaultKey);
            }
            webView.getSettings().setUserAgentString(newUa.toString());

            // Normaliza escala: ignora el tamaño de fuente del sistema TV
            // y ajusta el viewport para pantallas grandes.
            webView.getSettings().setTextZoom(100);
            webView.getSettings().setUseWideViewPort(true);
            webView.getSettings().setLoadWithOverviewMode(true);
            webView.getSettings().setDomStorageEnabled(true);
            webView.getSettings().setDatabaseEnabled(true);
            webView.setFocusable(true);
            webView.setFocusableInTouchMode(true);
            webView.requestFocus();
            webView.setWebViewClient(new AdBlockWebViewClient(getBridge(), defaultKey));
            webView.setWebChromeClient(new AdBlockWebChromeClient(getBridge()));

            // Persistencia de cookies (tvsess y tv_apk_key).
            try {
                CookieManager cm = CookieManager.getInstance();
                cm.setAcceptCookie(true);
                if (Build.VERSION.SDK_INT >= 21) cm.setAcceptThirdPartyCookies(webView, true);
                if (defaultKey != null && !defaultKey.isEmpty()) {
                    cm.setCookie("https://tvshowapp-one.vercel.app", "tv_apk_key=" + defaultKey + "; Path=/; Max-Age=31536000; SameSite=Lax");
                }
                cm.flush();
            } catch (Exception ignored2) {}
        } catch (Exception ignored) {}
    }

    @Override
    public void onPause() {
        super.onPause();
        try { CookieManager.getInstance().flush(); } catch (Exception ignored) {}
    }

    @Override
    public void onResume() {
        super.onResume();
        try {
            CookieManager cm = CookieManager.getInstance();
            cm.setAcceptCookie(true);
            if (Build.VERSION.SDK_INT >= 21) {
                try { cm.setAcceptThirdPartyCookies(getBridge().getWebView(), true); } catch (Exception ignored2) {}
            }
        } catch (Exception ignored) {}
    }

    @Override
    public void onBackPressed() {
        try {
            WebView webView = getBridge() != null ? getBridge().getWebView() : null;
            if (webView != null && webView.canGoBack()) {
                webView.goBack();
                return;
            }
        } catch (Exception ignored) {}
        super.onBackPressed();
    }
}
