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

    public AdBlockWebViewClient(Bridge bridge) {
        super(bridge);
    }

    private static final byte[] BLANK_HTML = "<!DOCTYPE html><html><head><style>html,body{background:transparent!important;overflow:hidden;display:none!important;margin:0;padding:0;}</style></head><body></body></html>".getBytes();

    @Override
    public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        try {
            if (request != null && request.getUrl() != null) {
                String url = request.getUrl().toString();
                if (AdBlock.isBlocked(url)) {
                    // Retornar HTML transparente y colapsado para evitar pantalla de error "Webpage not available"
                    return new WebResourceResponse("text/html", "UTF-8", new ByteArrayInputStream(BLANK_HTML));
                }
            }
        } catch (Exception ignored) {}
        return super.shouldInterceptRequest(view, request);
    }

    @Override
    public void onReceivedError(WebView view, WebResourceRequest request, android.webkit.WebResourceError error) {
        try {
            if (request != null && request.getUrl() != null) {
                String url = request.getUrl().toString();
                if (AdBlock.isBlocked(url) || url.contains("a-ads") || url.contains("banner") || url.contains("lactamclaes")) {
                    // Suprimir la página de error nativa "Webpage not available" para iframes publicitarios
                    return;
                }
            }
        } catch (Exception ignored) {}
        super.onReceivedError(view, request, error);
    }

    @Override
    public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
        try {
            if (failingUrl != null && (AdBlock.isBlocked(failingUrl) || failingUrl.contains("a-ads") || failingUrl.contains("banner") || failingUrl.contains("lactamclaes"))) {
                // Suprimir error para navegaciones de anuncios
                return;
            }
        } catch (Exception ignored) {}
        super.onReceivedError(view, errorCode, description, failingUrl);
    }

    private static boolean isAllowedHost(String host) {
        if (host == null) return false;
        host = host.toLowerCase();
        if (host.equals("tvshowapp.net") || host.endsWith(".tvshowapp.net") || host.equals("tvshowapp-one.vercel.app") || host.endsWith(".vercel.app") || host.equals("localhost") || host.equals("127.0.0.1") || host.equals("capacitor")) return true;
        // Embeds / imágenes permitidos dentro del WebView (no navegador externo)
        String[] allow = {"myembed.biz","redeflixapi.store","pipocacine.lat","vidcore.io","vidzy.org","vimeus.com","multiembed.mov","moviesapi.to","cinesrc.st","player.vidzee.wtf","embos.top","vidapi.xyz","streambetter.shop","megaembed.com","mgeb.top","image.tmdb.org","via.placeholder.com","metahub.space","static.tvmaze.com","m.media-amazon.com","githubusercontent.com","playerflix.ink","watchplay.shop","superflixapi.quest","reidoscanais.st","rdcanais.net"};
        for (String a : allow) if (host.equals(a) || host.endsWith("." + a)) return true;
        return false;
    }

    @Override
    public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
        try {
            String url = request.getUrl().toString();
            if (AdBlock.isBlocked(url)) return true;
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
            String cosmeticJs = "(function() {" +
                "  try {" +
                "    var st = document.getElementById('tvshow-adblock-cosmetic');" +
                "    if (!st) {" +
                "      st = document.createElement('style');" +
                "      st.id = 'tvshow-adblock-cosmetic';" +
                "      st.textContent = '[class*=\"banner\"],[id*=\"banner\"],[class*=\"overlay-ad\"],[id*=\"overlay-ad\"],[class*=\"video-ad\"],[class*=\"fluid_ad\"],[class*=\"vast\"],iframe[src*=\"a-ads.com\"],iframe[src*=\"a-ads\"],[id*=\"a-ads\"],a[href*=\"bc.game\"],a[href*=\"bcgame\"] { display: none !important; visibility: hidden !important; width: 0 !important; height: 0 !important; pointer-events: none !important; }';" +
                "      (document.head || document.documentElement).appendChild(st);" +
                "    }" +
                "    var ads = document.querySelectorAll('a[href*=\"bc.game\"], a[href*=\"bcgame\"], div[class*=\"banner\"], div[id*=\"banner\"], div[class*=\"overlay-ad\"], iframe[src*=\"a-ads\"]');" +
                "    for (var i = 0; i < ads.length; i++) {" +
                "      if (!ads[i].querySelector('video')) {" +
                "        ads[i].style.setProperty('display', 'none', 'important');" +
                "        ads[i].style.setProperty('pointer-events', 'none', 'important');" +
                "      }" +
                "    }" +
                "  } catch(e) {}" +
                "})();";
            view.evaluateJavascript(cosmeticJs, null);
        } catch (Exception ignored) {}
    }
}
