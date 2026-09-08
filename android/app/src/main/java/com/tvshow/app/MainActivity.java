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
            webView.setWebViewClient(new AdBlockWebViewClient(getBridge()));
            webView.setWebChromeClient(new AdBlockWebChromeClient(getBridge()));
        } catch (Exception ignored) {}
    }
}
