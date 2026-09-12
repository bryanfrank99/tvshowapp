package com.tvshow.app;

import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebViewClient;
import java.io.ByteArrayInputStream;

/**
 * Cliente WebView con bloqueo: recursos y navegaciones a hosts de ads
 * se cancelan; el resto delega al Bridge (servidor local + intents externos).
 */
public class AdBlockWebViewClient extends BridgeWebViewClient {
    private final String embeddedKey;

    public AdBlockWebViewClient(Bridge bridge, String embeddedKey) {
        super(bridge);
        this.embeddedKey = embeddedKey != null ? embeddedKey.trim() : "";
    }

    @Override
    public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        try {
            if (AdBlock.isBlocked(request.getUrl().toString())) {
                return new WebResourceResponse("text/plain", "utf-8", new ByteArrayInputStream(new byte[0]));
            }
        } catch (Exception ignored) {}
        return super.shouldInterceptRequest(view, request);
    }

    private static boolean isAllowedHost(String host) {
        if (host == null) return false;
        host = host.toLowerCase();
        if (host.equals("tvshowapp-one.vercel.app") || host.endsWith(".vercel.app") || host.equals("localhost") || host.equals("127.0.0.1") || host.equals("capacitor")) return true;
        // Embeds / imágenes permitidos dentro del WebView (no navegador externo)
        String[] allow = {"myembed.biz","redeflixapi.store","pipocacine.lat","vidcore.io","vidzy.org","vimeus.com","multiembed.mov","moviesapi.to","cinesrc.st","player.vidzee.wtf","embos.top","vidapi.xyz","streambetter.shop","image.tmdb.org","via.placeholder.com","metahub.space","static.tvmaze.com","m.media-amazon.com","githubusercontent.com","strem.io"};
        for (String a : allow) if (host.equals(a) || host.endsWith("." + a)) return true;
        return false;
    }

    @Override
    public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
        try {
            String url = request.getUrl().toString();
            if (AdBlock.isBlocked(url)) return true;
            // Si es un iframe / subframe (reproductor de video), permitir que cargue sus fuentes y CDNs
            if (android.os.Build.VERSION.SDK_INT >= 24 && !request.isForMainFrame()) {
                return false;
            }
            String host = request.getUrl().getHost();
            if (isAllowedHost(host)) return false; // cargar dentro del WebView
            // Bloquear apertura de navegador externo: todo lo demás se queda in-app (sin Intent)
            return true;
        } catch (Exception ignored) {}
        return true;
    }

    @Override
    public void onPageFinished(WebView view, String url) {
        super.onPageFinished(view, url);
        try {
            if (embeddedKey != null && !embeddedKey.isEmpty()) {
                String js = "(function() { try { " +
                        "var k = '" + embeddedKey + "'; " +
                        "localStorage.setItem('tvshow_code', k); " +
                        "document.cookie = 'tv_apk_key=' + k + '; path=/; max-age=31536000; SameSite=Lax'; " +
                        "window.dispatchEvent(new CustomEvent('tvshow_key_ready', { detail: k })); " +
                        "} catch(e){} })();";
                view.evaluateJavascript(js, null);
            }
        } catch (Exception ignored) {}
    }
}
