package com.tvshow.app;

import android.content.Context;
import android.net.Uri;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.HashSet;
import java.util.Set;

/**
 * Bloqueador a nivel WebView: compara hosts contra adhosts.txt embebido.
 * Coincide dominio exacto y subdominios (x.evil.com casa con evil.com).
 */
public final class AdBlock {
    private static final Set<String> HOSTS = new HashSet<>();
    private static volatile boolean loaded = false;

    private AdBlock() {}

    public static synchronized void initIfNeeded(Context ctx) {
        if (loaded) return;
        try (BufferedReader br = new BufferedReader(
                new InputStreamReader(ctx.getAssets().open("adhosts.txt")))) {
            String line;
            while ((line = br.readLine()) != null) {
                line = line.trim().toLowerCase();
                if (line.isEmpty() || line.startsWith("#")) continue;
                // Acepta formato hosts ("0.0.0.0 dominio") o dominio pelado.
                String[] parts = line.split("\\s+");
                String host = parts[parts.length - 1];
                if (host.contains(".")) HOSTS.add(host);
            }
        } catch (Exception ignored) {}
        loaded = true;
    }

    public static boolean isBlocked(String url) {
        if (url == null || HOSTS.isEmpty()) return false;
        String host;
        try {
            host = Uri.parse(url).getHost();
        } catch (Exception e) {
            return false;
        }
        if (host == null) return false;
        host = host.toLowerCase();
        if (HOSTS.contains(host)) return true;
        int dot = host.indexOf('.');
        while (dot != -1) {
            String parent = host.substring(dot + 1);
            if (HOSTS.contains(parent)) return true;
            dot = host.indexOf('.', dot + 1);
        }
        return false;
    }
}
