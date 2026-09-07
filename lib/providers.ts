// Lista de proveedores DINÁMICA:
// 1. La app intenta cargar JSON de NEXT_PUBLIC_PROVIDERS_URL (o /providers.json por defecto).
//    Ese JSON puede estar en cualquier URL (gist, tu servidor, CDN): para agregar,
//    modificar o eliminar un proveedor editas el JSON, sin tocar ni recompilar la app.
//    En producción (`next start`) el /providers.json de public/ se sirve desde disco,
//    así que editarlo en el servidor también aplica sin rebuild.
// 2. Si la URL falla, se usa la lista integrada de abajo (fallback).
//
// Esquema del JSON:
// {
//   "providers": [
//     { "id": "vidzy", "name": "Vidzy", "needsTmdb": true,
//       "movie": "https://vidzy.org/movie/{id}?autoplay=1",
//       "tv": "https://vidzy.org/serie/{id}/{s}/{e}?autoplay=1&autonext=1" }
//   ]
// }
// Placeholders: {id} {s} {e} {key}. {key} = entry.key o NEXT_PUBLIC_VIMEUS_VIEW_KEY.

export type ProviderId = string;

export type ProviderDef = {
  id: string;
  name: string;
  needsTmdb?: boolean;
  movie: string;
  tv: string;
  key?: string;
  // sandbox opcional: sin allow-popups bloquea ventanas emergentes y secuestros
  // de la página. StreamBetter lo prohíbe (no ponerlo ahí).
  sandbox?: string;
};

export type Provider = {
  id: string;
  name: string;
  needsTmdb: boolean;
  movie: (id: string) => string;
  tv: (id: string, s: number, e: number) => string;
  sandbox: string;
};

// View key personal de Vimeus (Settings → General). SOLO por variable de entorno
// NEXT_PUBLIC_VIMEUS_VIEW_KEY (ver .env.example). Nunca commitear keys.
const envVimeusKey = () =>
  (typeof process !== "undefined" ? process.env.NEXT_PUBLIC_VIMEUS_VIEW_KEY : "") || "";

function fill(tpl: string, id: string, s: number, e: number, key: string) {
  const idparam = id.startsWith("tt") ? `imdb=${id}` : `tmdb=${id}`;
  return tpl.split("{id}").join(id).split("{s}").join(String(s)).split("{e}").join(String(e)).split("{key}").join(key).split("{idparam}").join(idparam);
}

export function buildProvider(def: ProviderDef, envKey = ""): Provider {
  const key = def.key || envKey || "";
  return {
    id: def.id,
    name: def.name,
    needsTmdb: !!def.needsTmdb,
    sandbox: def.sandbox || "",
    movie: (id) => fill(def.movie, id, 1, 1, key),
    tv: (id, s, e) => fill(def.tv, id, s, e, key),
  };
}

export const DEFAULT_PROVIDER = "vidcore";

// ---- Carga remota (cliente) con caché de 1h en localStorage ----
const LS_CACHE = "tvshow_providers_cache_v2";
const TTL = 3600 * 1000;

export function providersUrl() {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_PROVIDERS_SOURCE === "local") {
    return "/providers.json"; // modo test: JSON local del repo, sin tocar el remoto
  }
  return (typeof process !== "undefined" && process.env.NEXT_PUBLIC_PROVIDERS_URL) || "/providers.json";
}

export async function fetchProviders(): Promise<{ list: Provider[]; version: string }> {
  try {
    const raw = localStorage.getItem(LS_CACHE);
    if (raw) {
      const c = JSON.parse(raw);
      if (c.t + TTL > Date.now() && Array.isArray(c.list) && c.list.length) {
        return { list: c.list.map((d: ProviderDef) => buildProvider(d, envKey())), version: c.version || "" };
      }
    }
  } catch {}
  const r = await fetch(providersUrl(), { cache: "no-store" });
  if (!r.ok) throw new Error("http " + r.status);
  const j = await r.json();
  const arr: ProviderDef[] = Array.isArray(j) ? j : j.providers;
  if (!Array.isArray(arr) || !arr.length) throw new Error("empty");
  const valid = arr.filter((d) => d && d.id && d.name && d.movie && d.tv);
  if (!valid.length) throw new Error("invalid");
  const version = String((!Array.isArray(j) && j.version) || "");
  try { localStorage.setItem(LS_CACHE, JSON.stringify({ t: Date.now(), list: valid, version })); } catch {}
  return { list: valid.map((d) => buildProvider(d, envKey())), version };
}

function envKey() {
  return envVimeusKey();
}

// ---- Fuentes de TV en vivo (también configurables en el mismo JSON) ----
// Esquema: "live": [{ "id": "tvf90", "name": "Agenda deportiva", "format": "tvf90"|"streambetter", "list": "https://..." }]
export type LiveSource = { id: string; name: string; format: "streambetter" | "tvf90"; list: string };

const BUILTIN_LIVE: LiveSource[] = [];

const LS_LIVE = "tvshow_live_cache_v2";

export async function fetchLiveSources(): Promise<LiveSource[]> {
  try {
    const raw = localStorage.getItem(LS_LIVE);
    if (raw) {
      const c = JSON.parse(raw);
      if (c.t + TTL > Date.now() && Array.isArray(c.list) && c.list.length) return c.list;
    }
  } catch {}
  try {
    const r = await fetch(providersUrl(), { cache: "no-store" });
    if (!r.ok) throw new Error();
    const j = await r.json();
    const arr = j.live;
    if (!Array.isArray(arr) || !arr.length) throw new Error("empty");
    const valid = arr.filter((s) => s && s.id && s.name && s.format && s.list);
    if (!valid.length) throw new Error("invalid");
    try { localStorage.setItem(LS_LIVE, JSON.stringify({ t: Date.now(), list: valid })); } catch {}
    return valid;
  } catch {
    return BUILTIN_LIVE;
  }
}
