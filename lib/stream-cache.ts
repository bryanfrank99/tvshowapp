// lib/stream-cache.ts
// Gestión y persistencia de streams M3U8/HLS en Base de Datos Supabase
// Reduce la latencia de carga de servidores de 5s+ a <20ms para streams ya extraídos.

import { supa } from "./supa";

export interface CachedStreamRecord {
  id: string;
  providerId: string;
  mediaType: "movie" | "tv";
  targetId: string;
  season?: number;
  episode?: number;
  hlsUrl: string;
  backupHlsUrls?: string[];
  extractedAt: string;
  expiresAt: string;
}

export interface GetCachedStreamParams {
  providerId: string;
  type: "movie" | "tv";
  targetId: string;
  season?: number;
  episode?: number;
}

export interface SetCachedStreamParams extends GetCachedStreamParams {
  hlsUrl: string;
  backupHlsUrls?: string[];
  ttlHours?: number;
}

// Caché en memoria para evitar llamadas redundantes a BD en la misma instancia de Node/Next.js
const memoryCache = new Map<string, { data: CachedStreamRecord; expires: number }>();

export function buildStreamCacheKey(p: GetCachedStreamParams): string {
  const s = p.season || 1;
  const e = p.episode || 1;
  return p.type === "tv"
    ? `${p.providerId}:tv:${p.targetId}:${s}:${e}`
    : `${p.providerId}:movie:${p.targetId}`;
}

/**
 * Obtiene un stream directo M3U8 de la base de datos o memoria si aún no ha expirado.
 */
export async function getCachedStream(
  params: GetCachedStreamParams
): Promise<{ hlsUrl: string; backupHlsUrls?: string[] } | null> {
  const key = buildStreamCacheKey(params);
  const now = Date.now();

  // 1. Verificar caché en memoria
  const mem = memoryCache.get(key);
  if (mem && mem.expires > now) {
    return {
      hlsUrl: mem.data.hlsUrl,
      backupHlsUrls: mem.data.backupHlsUrls,
    };
  }

  // 2. Consultar Base de Datos Supabase
  try {
    const sb = supa();
    const nowIso = new Date().toISOString();

    // Intentar consultar tabla dedicada `stream_cache`
    const { data, error } = await (sb as any)
      .from("stream_cache")
      .select("id, hls_url, backup_urls, expires_at")
      .eq("id", key)
      .gt("expires_at", nowIso)
      .maybeSingle();

    const row = data as any;
    if (!error && row && row.hls_url) {
      const backupUrls = Array.isArray(row.backup_urls)
        ? row.backup_urls
        : typeof row.backup_urls === "string"
        ? JSON.parse(row.backup_urls)
        : [];

      // Guardar en memoria
      memoryCache.set(key, {
        data: {
          id: key,
          providerId: params.providerId,
          mediaType: params.type,
          targetId: params.targetId,
          season: params.season,
          episode: params.episode,
          hlsUrl: row.hls_url,
          backupHlsUrls: backupUrls,
          extractedAt: nowIso,
          expiresAt: row.expires_at,
        },
        expires: new Date(row.expires_at).getTime(),
      });

      return {
        hlsUrl: row.hls_url,
        backupHlsUrls: backupUrls,
      };
    }

    // Fallback a tabla `config` si `stream_cache` aún no ha sido migrada en Supabase
    if (error && (error.code === "42P01" || error.message?.includes("does not exist"))) {
      const configKey = `stream:${key}`;
      const configRes = await (sb as any)
        .from("config")
        .select("value, updated_at")
        .eq("key", configKey)
        .maybeSingle();

      const configVal = (configRes?.data as any)?.value;
      if (configVal) {
        try {
          const parsed = JSON.parse(configVal);
          if (parsed && parsed.hlsUrl && (!parsed.expiresAt || new Date(parsed.expiresAt).getTime() > now)) {
            return {
              hlsUrl: parsed.hlsUrl,
              backupHlsUrls: parsed.backupHlsUrls || [],
            };
          }
        } catch {}
      }
    }
  } catch {}

  return null;
}

/**
 * Guarda un stream M3U8 extraído en la base de datos Supabase con TTL configurable.
 */
export async function setCachedStream(
  params: SetCachedStreamParams
): Promise<boolean> {
  const key = buildStreamCacheKey(params);
  const ttlHours = params.ttlHours || 24;
  const expiresAt = new Date(Date.now() + ttlHours * 3600 * 1000).toISOString();
  const extractedAt = new Date().toISOString();
  const backupHlsUrls = params.backupHlsUrls || [];

  // 1. Guardar en memoria de inmediato
  memoryCache.set(key, {
    data: {
      id: key,
      providerId: params.providerId,
      mediaType: params.type,
      targetId: params.targetId,
      season: params.season,
      episode: params.episode,
      hlsUrl: params.hlsUrl,
      backupHlsUrls,
      extractedAt,
      expiresAt,
    },
    expires: new Date(expiresAt).getTime(),
  });

  // 2. Persistir en Base de Datos Supabase
  try {
    const sb = supa();

    // Intentar upsert en tabla `stream_cache`
    const { error } = await (sb as any).from("stream_cache").upsert(
      {
        id: key,
        provider_id: params.providerId,
        media_type: params.type,
        target_id: params.targetId,
        season: params.season || 1,
        episode: params.episode || 1,
        hls_url: params.hlsUrl,
        backup_urls: backupHlsUrls,
        extracted_at: extractedAt,
        expires_at: expiresAt,
      },
      { onConflict: "id" }
    );

    if (!error) return true;

    // Fallback a tabla `config` si `stream_cache` no existe aún
    if (error.code === "42P01" || error.message?.includes("does not exist")) {
      const configKey = `stream:${key}`;
      const payload = JSON.stringify({
        hlsUrl: params.hlsUrl,
        backupHlsUrls,
        providerId: params.providerId,
        mediaType: params.type,
        targetId: params.targetId,
        season: params.season,
        episode: params.episode,
        extractedAt,
        expiresAt,
      });

      await (sb as any).from("config").upsert(
        {
          key: configKey,
          value: payload,
          updated_at: extractedAt,
        },
        { onConflict: "key" }
      );
      return true;
    }
  } catch {}

  return false;
}
