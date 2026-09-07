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

    @Override
    public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        try {
            if (AdBlock.isBlocked(request.getUrl().toString())) {
                return new WebResourceResponse("text/plain", "utf-8", new ByteArrayInputStream(new byte[0]));
            }
        } catch (Exception ignored) {}
        return super.shouldInterceptRequest(view, request);
    }

    @Override
    public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
        try {
            if (AdBlock.isBlocked(request.getUrl().toString())) return true;
        } catch (Exception ignored) {}
        return super.shouldOverrideUrlLoading(view, request);
    }
}
