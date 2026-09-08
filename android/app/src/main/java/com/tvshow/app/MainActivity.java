package com.tvshow.app;

import android.os.Bundle;
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
            webView.setWebViewClient(new AdBlockWebViewClient(getBridge()));
            webView.setWebChromeClient(new AdBlockWebChromeClient(getBridge()));
        } catch (Exception ignored) {}
    }
}
