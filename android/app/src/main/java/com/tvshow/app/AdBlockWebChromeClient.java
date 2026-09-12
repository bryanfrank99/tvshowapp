package com.tvshow.app;

import android.os.Message;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebChromeClient;

/**
 * Popups (window.open / target=_blank): bloqueados o contenidos in-app, nunca navegador externo.
 */
public class AdBlockWebChromeClient extends BridgeWebChromeClient {

    public AdBlockWebChromeClient(Bridge bridge) {
        super(bridge);
    }

    private static boolean isAllowedHost(String host) {
        if (host == null) return false;
        host = host.toLowerCase();
        if (host.equals("tvshowapp-one.vercel.app") || host.endsWith(".vercel.app") || host.equals("localhost") || host.equals("capacitor")) return true;
        String[] allow = {"myembed.biz","redeflixapi.store","pipocacine.lat","vidcore.io","vidzy.org","vimeus.com","multiembed.mov","moviesapi.to","cinesrc.st","player.vidzee.wtf","embos.top","vidapi.xyz","streambetter.shop","megaembed.com","mgeb.top","image.tmdb.org"};
        for (String a : allow) if (host.equals(a) || host.endsWith("." + a)) return true;
        return false;
    }

    @Override
    public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
        WebView tmp = new WebView(view.getContext());
        tmp.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (AdBlock.isBlocked(url)) return true;
                String host = request.getUrl().getHost();
                if (isAllowedHost(host)) {
                    try { view.loadUrl(url); } catch (Exception ignored) {}
                    return true;
                }
                // Bloquear externo: no Intent, no navegación
                return true;
            }
        });
        ((WebView.WebViewTransport) resultMsg.obj).setWebView(tmp);
        resultMsg.sendToTarget();
        return true;
    }

    @Override
    public void onCloseWindow(WebView window) {
        try { window.destroy(); } catch (Exception ignored) {}
    }
}
