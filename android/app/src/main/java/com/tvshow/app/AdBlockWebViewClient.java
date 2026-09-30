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
        String[] allow = {"myembed.biz","redeflixapi.store","pipocacine.lat","vidcore.io","vidzy.org","vimeus.com","multiembed.mov","moviesapi.to","cinesrc.st","player.vidzee.wtf","embos.top","vidapi.xyz","streambetter.shop","megaembed.com","mgeb.top","vimeos.net","goodstream.one","cinecalidad.am","image.tmdb.org","via.placeholder.com","metahub.space","static.tvmaze.com","m.media-amazon.com","githubusercontent.com","playerflix.ink","watchplay.shop","superflixapi.quest","reidoscanais.st","rdcanais.net","qzz.io","youtube.com","youtube-nocookie.com","googlevideo.com","ytimg.com"};
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
            // Inyección JS completa: defusers + cosmético + purga DOM (paridad con Electron main.js)
            String fullJs = "(function() {" +
                "  try {" +
                // ── 1. Defusers: neutralizar funciones de ads/popunders de los players ──
                "    window.open = function() { return null; };" +
                "    window.alert = function() { return null; };" +
                "    window.confirm = function() { return false; };" +
                "    window.rfShouldCheckAdblock = function() { return false; };" +
                "    window.openExternalAd = function() { return false; };" +
                "    window.triggerExternalAd = function() { return false; };" +
                "    window.armExternalClickHitbox = function() {};" +
                "    window.externalAdUrl = '';" +
                "    if (typeof Object.defineProperty === 'function') {" +
                "      try {" +
                "        Object.defineProperty(window, 'externalAdUrl', { value: '', writable: false, configurable: false });" +
                "        Object.defineProperty(window, 'rfShouldCheckAdblock', { value: function(){return false;}, writable: false, configurable: false });" +
                "      } catch(dp) {}" +
                "    }" +
                // ── 2. CSS cosmético completo (paridad con Electron) ──
                "    var st = document.getElementById('tvshow-adblock-cosmetic');" +
                "    if (!st) {" +
                "      st = document.createElement('style');" +
                "      st.id = 'tvshow-adblock-cosmetic';" +
                "      st.textContent = '" +
                        "[class*=\"banner\"],[id*=\"banner\"]," +
                        "[class*=\"overlay-ad\"],[id*=\"overlay-ad\"]," +
                        "[class*=\"video-ad\"],[id*=\"video-ad\"]," +
                        "[class*=\"fluid_ad\"],[id*=\"fluid_ad\"]," +
                        "[class*=\"vast-\"],[id*=\"vast-\"]," +
                        "[class*=\"floating-ad\"],[id*=\"floating-ad\"]," +
                        "[class*=\"ad-overlay\"],[id*=\"ad-overlay\"]," +
                        "[class*=\"ad_overlay\"],[id*=\"ad_overlay\"]," +
                        "#player-external-click-hitbox," +
                        "a[href*=\"bc.game\"],a[href*=\"bcgame\"],a[href*=\"betano\"],a[href*=\"casino\"],a[href*=\"lactamclaes\"]," +
                        "iframe[src*=\"a-ads.com\"],iframe[src*=\"a-ads\"],[id*=\"a-ads\"],[class*=\"a-ads\"]," +
                        "iframe[src*=\"lactamclaes\"],iframe[src*=\"waust\"]," +
                        "iframe[src*=\"popads\"],iframe[src*=\"popcash\"],iframe[src*=\"propellerads\"]," +
                        "iframe[src*=\"juicyads\"],iframe[src*=\"exoclick\"],iframe[src*=\"adsterra\"]," +
                        "iframe[src*=\"magsrv\"],iframe[src*=\"trafficjunky\"]," +
                        "iframe[src*=\"admaven\"],iframe[src*=\"tsyndicate\"],iframe[src*=\"bidvertiser\"]," +
                        "[class*=\"adsbygoogle\"],[id*=\"adsbygoogle\"]," +
                        "ins.adsbygoogle" +
                        " { display: none !important; visibility: hidden !important; opacity: 0 !important; pointer-events: none !important; width: 0 !important; height: 0 !important; max-height: 0 !important; overflow: hidden !important; }';" +
                "      (document.head || document.documentElement).appendChild(st);" +
                "    }" +
                // ── 3. Purga DOM periódica (hitbox + banners) ──
                "    var purge = function() {" +
                "      var hb = document.getElementById('player-external-click-hitbox');" +
                "      if (hb) {" +
                "        hb.style.setProperty('display', 'none', 'important');" +
                "        hb.style.setProperty('pointer-events', 'none', 'important');" +
                "        if (hb.parentNode) hb.parentNode.removeChild(hb);" +
                "      }" +
                "      var sel = 'a[href*=\"bc.game\"],a[href*=\"bcgame\"],a[href*=\"betano\"],a[href*=\"lactamclaes\"]," +
                        "iframe[src*=\"a-ads\"],iframe[src*=\"lactamclaes\"],iframe[src*=\"waust\"]," +
                        "iframe[src*=\"popads\"],iframe[src*=\"popcash\"],iframe[src*=\"adsterra\"]," +
                        "iframe[src*=\"magsrv\"],iframe[src*=\"exoclick\"]," +
                        "[id*=\"a-ads\"],[class*=\"a-ads\"]," +
                        "ins.adsbygoogle,[class*=\"adsbygoogle\"]';" +
                "      var ads = document.querySelectorAll(sel);" +
                "      for (var i = 0; i < ads.length; i++) {" +
                "        if (ads[i] && !ads[i].querySelector('video')) {" +
                "          ads[i].style.setProperty('display', 'none', 'important');" +
                "          ads[i].style.setProperty('pointer-events', 'none', 'important');" +
                "          ads[i].style.setProperty('width', '0', 'important');" +
                "          ads[i].style.setProperty('height', '0', 'important');" +
                "        }" +
                "      }" +
                "    };" +
                "    purge();" +
                "    var pi = setInterval(purge, 400);" +
                "    setTimeout(function() { clearInterval(pi); }, 25000);" +
                // ── 4. MutationObserver: capturar ads inyectados dinámicamente ──
                "    if (typeof MutationObserver === 'function') {" +
                "      var obs = new MutationObserver(function(mutations) {" +
                "        for (var m = 0; m < mutations.length; m++) {" +
                "          var added = mutations[m].addedNodes;" +
                "          for (var n = 0; n < added.length; n++) {" +
                "            var node = added[n];" +
                "            if (node.nodeType !== 1) continue;" +
                "            var tag = (node.tagName || '').toLowerCase();" +
                "            var src = (node.src || node.href || '').toLowerCase();" +
                "            var id = (node.id || '').toLowerCase();" +
                "            var cls = (node.className || '').toLowerCase();" +
                "            if (tag === 'iframe' && (src.indexOf('a-ads') !== -1 || src.indexOf('popads') !== -1 || src.indexOf('popcash') !== -1 || src.indexOf('adsterra') !== -1 || src.indexOf('exoclick') !== -1 || src.indexOf('magsrv') !== -1 || src.indexOf('lactamclaes') !== -1 || src.indexOf('waust') !== -1 || src.indexOf('admaven') !== -1 || src.indexOf('tsyndicate') !== -1)) {" +
                "              node.style.setProperty('display', 'none', 'important');" +
                "              node.src = 'about:blank';" +
                "            }" +
                "            if (id === 'player-external-click-hitbox' || id.indexOf('a-ads') !== -1 || cls.indexOf('a-ads') !== -1) {" +
                "              node.style.setProperty('display', 'none', 'important');" +
                "              node.style.setProperty('pointer-events', 'none', 'important');" +
                "              if (node.parentNode) node.parentNode.removeChild(node);" +
                "            }" +
                "            if (tag === 'a' && (src.indexOf('bc.game') !== -1 || src.indexOf('bcgame') !== -1 || src.indexOf('betano') !== -1 || src.indexOf('lactamclaes') !== -1)) {" +
                "              node.style.setProperty('display', 'none', 'important');" +
                "            }" +
                "          }" +
                "        }" +
                "      });" +
                "      obs.observe(document.body || document.documentElement, { childList: true, subtree: true });" +
                "      setTimeout(function() { obs.disconnect(); }, 30000);" +
                "    }" +
                "  } catch(e) {}" +
                "})();";
            view.evaluateJavascript(fullJs, null);
        } catch (Exception ignored) {}
    }
}
