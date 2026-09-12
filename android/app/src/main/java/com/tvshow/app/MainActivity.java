package com.tvshow.app;

import android.os.Build;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        AdBlock.initIfNeeded(this);
        try {
            WebView webView = getBridge().getWebView();
            // Marca UA para que la web active el modo TV (sin barra móvil).
            String ua = webView.getSettings().getUserAgentString();
            if (ua != null && !ua.contains("TVShowTV")) {
                webView.getSettings().setUserAgentString(ua + " TVShowTV");
            }
            // Normaliza escala: ignora el tamaño de fuente del sistema TV
            // y ajusta el viewport para pantallas grandes.
            webView.getSettings().setTextZoom(100);
            webView.getSettings().setUseWideViewPort(true);
            webView.getSettings().setLoadWithOverviewMode(true);
            webView.setFocusable(true);
            webView.setFocusableInTouchMode(true);
            webView.requestFocus();
            webView.setWebViewClient(new AdBlockWebViewClient(getBridge()));
            webView.setWebChromeClient(new AdBlockWebChromeClient(getBridge()));
            webView.addJavascriptInterface(new AppUpdaterBridge(this), "AndroidUpdater");
            // Persistencia de cookies (tvsess). Sin esto la cookie queda solo en RAM y se pierde al matar la app (018).
            try {
                CookieManager cm = CookieManager.getInstance();
                cm.setAcceptCookie(true);
                if (Build.VERSION.SDK_INT >= 21) cm.setAcceptThirdPartyCookies(webView, true);
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
