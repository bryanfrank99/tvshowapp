package com.tvshow.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Message;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebChromeClient;

/**
 * Popups (window.open / target=_blank): hosts de ads se deniegan;
 * el resto se abre en el navegador externo, nunca dentro de la app.
 */
public class AdBlockWebChromeClient extends BridgeWebChromeClient {

    public AdBlockWebChromeClient(Bridge bridge) {
        super(bridge);
    }

    @Override
    public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
        WebView tmp = new WebView(view.getContext());
        tmp.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (AdBlock.isBlocked(url)) return true;
                try {
                    Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    v.getContext().startActivity(i);
                } catch (Exception ignored) {}
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
