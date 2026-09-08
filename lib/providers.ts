// Lista de proveedores DINÁMICA (sin NEXT_PUBLIC_*):
// 1. El cliente pide /api/config (servidor) que dice qué JSON cargar.
//    Editar ese JSON agrega/quita servidores sin tocar ni recompilar la app.
// 2. Las URLs finales con key se construyen en /api/embed-url (servidor).
//
// Esquema del JSON:
// {
//   "providers": [
//     { "id": "vidzy", "name": "Vidzy", "needsTmdb": true,
//       "movie": "https://vidzy.org/movie/{id}?autoplay=1",
//       "tv": "https://vidzy.org/serie/{id}/{s}/{e}?autoplay=1&autonext=1" }
//   ]
// }
// Placeholders: {id} {s} {e} {key} {idparam}. {key} sale del JSON (entry.key)
// o se inyecta en servidor (/api/embed-url con VIMEUS_VIEW_KEY).

export type ProviderId = string;

export type ProviderDef = {
  id: string;
  name: string;
  needsTmdb?: boolean;
  tvOk?: boolean; // true = se maneja bien con mando (oculta "Abrir externo")
  movie: string;
  tv: string;
  key?: string;
  sandbox?: string;
};

export type Provider = {
  id: string;
  name: string;
  needsTmdb: boolean;
  tvOk: boolean;
  movie: (id: string) => string;
  tv: (id: string, s: number, e: number) => string;
  sandbox: string;
};

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
    tvOk: !!def.tvOk,
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
  // Solo lectura síncrona legacy; el flujo real usa remoteJsonUrl().
  return "/providers.json";
}

let cachedUrl: string | null = null;

// URL del JSON resuelta en SERVIDOR (/api/config): sin NEXT_PUBLIC_*.
export async function remoteJsonUrl(): Promise<string> {
  if (cachedUrl) return cachedUrl;
  try {
    const r = await fetch("/api/config", { cache: "no-store" });
    if (r.ok) {
      const j = await r.json();
      const u = String(j.providersUrl || "");
      if (u && !u.includes("(local)")) {
        cachedUrl = u;
        return u;
      }
    }
  } catch {}
  cachedUrl = "/providers.json";
  return cachedUrl;
}

export async function fetchProviders(): Promise<{ list: Provider[]; version: string }> {
  const url = await remoteJsonUrl();
  try {
    const raw = localStorage.getItem(LS_CACHE);
    if (raw) {
      const c = JSON.parse(raw);
      if (c.t + TTL > Date.now() && Array.isArray(c.list) && c.list.length && c.url === url) {
        return { list: c.list.map((d: ProviderDef) => buildProvider(d, "")), version: c.version || "" };
      }
    }
  } catch {}
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error("http " + r.status);
  const j = await r.json();
  const arr: ProviderDef[] = Array.isArray(j) ? j : j.providers;
  if (!Array.isArray(arr) || !arr.length) throw new Error("empty");
  const valid = arr.filter((d) => d && d.id && d.name && d.movie && d.tv);
  if (!valid.length) throw new Error("invalid");
  const version = String((!Array.isArray(j) && j.version) || "");
  try { localStorage.setItem(LS_CACHE, JSON.stringify({ t: Date.now(), list: valid, version, url })); } catch {}
  return { list: valid.map((d) => buildProvider(d, "")), version };
}

function envKey() {
  return "";
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
    const r = await fetch(await remoteJsonUrl(), { cache: "no-store" });
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
