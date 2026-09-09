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
// Placeholders: {id} {s} {e} {key} {idparam} {tmdbflag}.
// {idparam} = imdb=tt…|tmdb=… (Vimeus); {tmdbflag} = ""|"&tmdb=1" (SuperEmbed).

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
  const tmdbflag = id.startsWith("tt") ? "" : "&tmdb=1";
  return tpl.split("{id}").join(id).split("{s}").join(String(s)).split("{e}").join(String(e)).split("{key}").join(key).split("{idparam}").join(idparam).split("{tmdbflag}").join(tmdbflag);
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

// ---- Carga desde Supabase vía /api/providers (requiere sesión) ----
const LS_CACHE = "tvshow_providers_cache_v3";
const TTL = 3600 * 1000;

export function providersUrl() {
  return "/providers.json"; // legacy, ya no se usa como fuente
}

type Catalog = { providers: any[]; live: any[]; version: string };
let inflight: Promise<Catalog> | null = null;

function loadCatalog(): Promise<Catalog> {
  if (!inflight) {
    inflight = (async () => {
      try {
        const r = await fetch("/api/providers", { cache: "no-store" });
        if (r.status === 401) {
          try { localStorage.removeItem(LS_CACHE); } catch {}
          throw new Error("locked");
        }
        if (!r.ok) throw new Error("http " + r.status);
        const j = await r.json();
        const out = { providers: j.providers || [], live: j.live || [], version: String(j.version || "") };
        try { localStorage.setItem(LS_CACHE, JSON.stringify({ t: Date.now(), ...out })); } catch {}
        return out;
      } catch (e: any) {
        if (String(e?.message) === "locked") throw e;
        // Fallback a caché solo por error de red, no por locked
        try {
          const raw = localStorage.getItem(LS_CACHE);
          if (raw) {
            const c = JSON.parse(raw);
            if (c.t + TTL > Date.now() && Array.isArray(c.providers)) {
              return { providers: c.providers, live: c.live || [], version: c.version || "" };
            }
          }
        } catch {}
        throw e;
      }
    })().finally(() => { inflight = null; });
  }
  return inflight;
}

export function clearProvidersCache() {
  try { localStorage.removeItem(LS_CACHE); } catch {}
}

export async function fetchProviders(): Promise<{ list: Provider[]; version: string }> {
  const c = await loadCatalog();
  if (!c.providers.length) throw new Error("empty");
  return {
    list: c.providers.map((d: any) => buildProvider({ id: d.id, name: d.name, needsTmdb: d.needsTmdb, tvOk: d.tvOk, movie: "", tv: "" }, "")),
    version: c.version,
  };
}

// ---- Fuentes de TV en vivo (también configurables en el mismo JSON) ----
// Esquema: "live": [{ "id": "tvf90", "name": "Agenda deportiva", "format": "tvf90"|"streambetter", "list": "https://..." }]
export type LiveSource = { id: string; name: string; format: "streambetter" | "tvf90"; list: string };

const LS_LIVE = "tvshow_live_cache_v2"; // legacy, sin uso

export async function fetchLiveSources(): Promise<LiveSource[]> {
  const c = await loadCatalog().catch(() => null);
  const valid = (c?.live || []).filter((s) => s && s.id && s.name && s.format && s.list);
  return valid;
}
