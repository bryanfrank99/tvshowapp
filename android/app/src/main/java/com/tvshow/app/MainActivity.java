package com.tvshow.app;

import android.os.Build;
import android.os.Bundle;
import android.view.KeyEvent;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private volatile boolean isPlayerLocked = false;

    public class TVPlayerBridge {
        @JavascriptInterface
        public void setPlayerLocked(boolean locked) {
            isPlayerLocked = locked;
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        AdBlock.initIfNeeded(this);
        try {
            WebView webView = getBridge().getWebView();
            // Inyecta UA_TAG dinámico según el flavor (TVShowTV o TVShowMobile)
            String ua = webView.getSettings().getUserAgentString();
            String tag = BuildConfig.UA_TAG;
            if (ua != null && tag != null && !ua.contains(tag)) {
                webView.getSettings().setUserAgentString(ua + " " + tag);
            }

            // Normaliza escala y controles según el dispositivo
            if ("tv".equals(BuildConfig.APP_MODE)) {
                webView.getSettings().setTextZoom(100);
                webView.getSettings().setUseWideViewPort(true);
                webView.getSettings().setLoadWithOverviewMode(true);
                webView.setFocusable(true);
                webView.setFocusableInTouchMode(true);
                webView.requestFocus();
            } else {
                webView.getSettings().setUseWideViewPort(true);
                webView.getSettings().setLoadWithOverviewMode(true);
            }
            webView.setWebViewClient(new AdBlockWebViewClient(getBridge()));
            webView.setWebChromeClient(new AdBlockWebChromeClient(getBridge()));
            webView.addJavascriptInterface(new AppUpdaterBridge(this), "AndroidUpdater");
            webView.addJavascriptInterface(new TVPlayerBridge(), "AndroidPlayerBridge");
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
    public boolean dispatchKeyEvent(KeyEvent event) {
        if (isPlayerLocked) {
            int keyCode = event.getKeyCode();
            int action = event.getAction();

            // Tecla Atrás: Desactiva el modo reproductor bloqueado, cierra pantalla completa y devuelve el foco a TVShow
            if (keyCode == KeyEvent.KEYCODE_BACK) {
                if (action == KeyEvent.ACTION_UP) {
                    isPlayerLocked = false;
                    WebView webView = getBridge() != null ? getBridge().getWebView() : null;
                    if (webView != null) {
                        webView.post(() -> webView.evaluateJavascript("window.__exitPlayerLocked && window.__exitPlayerLocked();", null));
                    }
                }
                return true;
            }

            // D-Pad Derecha / Abajo: Traduce a TAB nativo (avanzar al siguiente control dentro del reproductor)
            if (keyCode == KeyEvent.KEYCODE_DPAD_RIGHT || keyCode == KeyEvent.KEYCODE_DPAD_DOWN) {
                WebView webView = getBridge() != null ? getBridge().getWebView() : null;
                if (webView != null) {
                    KeyEvent tabEvent = new KeyEvent(event.getDownTime(), event.getEventTime(), action, KeyEvent.KEYCODE_TAB, event.getRepeatCount(), 0);
                    return webView.dispatchKeyEvent(tabEvent);
                }
            }

            // D-Pad Izquierda / Arriba: Traduce a SHIFT + TAB nativo (retroceder al control anterior dentro del reproductor)
            if (keyCode == KeyEvent.KEYCODE_DPAD_LEFT || keyCode == KeyEvent.KEYCODE_DPAD_UP) {
                WebView webView = getBridge() != null ? getBridge().getWebView() : null;
                if (webView != null) {
                    KeyEvent shiftTabEvent = new KeyEvent(event.getDownTime(), event.getEventTime(), action, KeyEvent.KEYCODE_TAB, event.getRepeatCount(), KeyEvent.META_SHIFT_ON | KeyEvent.META_SHIFT_LEFT_ON);
                    return webView.dispatchKeyEvent(shiftTabEvent);
                }
            }
        }
        return super.dispatchKeyEvent(event);
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
