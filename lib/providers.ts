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

export type ProviderLang = "es" | "lat" | "en" | "pt" | "multi";

export const DEFAULT_PROVIDER_LANGS: Record<string, ProviderLang> = {
  vidcore: "es",
  embos: "lat",
  streambetter: "pt",
  embedmovies: "pt",
  redeflix: "pt",
  pipocacine: "pt",
  vidapi: "en",
  vidzy: "multi",
  vimeus: "multi",
  superembed: "en",
  moviesapi: "en",
  cinesrc: "en",
  vidzee: "en",
};

export const PROVIDER_LANGS: { id: ProviderLang; name: string; flag: string; badge: string }[] = [
  { id: "es", name: "Español (Castellano)", flag: "🇪🇸", badge: "ES" },
  { id: "lat", name: "Español (Latino)", flag: "🇲🇽", badge: "LAT" },
  { id: "multi", name: "Multi-idioma / Dual", flag: "🌐", badge: "MULTI" },
  { id: "en", name: "English (VO / Sub)", flag: "🇺🇸", badge: "EN" },
  { id: "pt", name: "Português", flag: "🇧🇷", badge: "PT" },
];

export function getProviderLangMeta(lang?: string) {
  const clean = (lang || "").toLowerCase().trim();
  if (clean === "lat" || clean === "latino") {
    return { id: "lat" as const, name: "Latino", flag: "🇲🇽", badge: "LAT", color: "text-amber-300 bg-amber-500/15 border-amber-500/30" };
  }
  if (clean === "es" || clean === "castellano" || clean === "español") {
    return { id: "es" as const, name: "Castellano", flag: "🇪🇸", badge: "ES", color: "text-yellow-300 bg-yellow-500/15 border-yellow-500/30" };
  }
  if (clean === "pt" || clean === "portugues" || clean === "português") {
    return { id: "pt" as const, name: "Português", flag: "🇧🇷", badge: "PT", color: "text-emerald-300 bg-emerald-500/15 border-emerald-500/30" };
  }
  if (clean === "en" || clean === "english" || clean === "ingles" || clean === "inglés") {
    return { id: "en" as const, name: "English", flag: "🇺🇸", badge: "EN", color: "text-sky-300 bg-sky-500/15 border-sky-500/30" };
  }
  return { id: "multi" as const, name: "Multi", flag: "🌐", badge: "MULTI", color: "text-purple-300 bg-purple-500/15 border-purple-500/30" };
}

export type ProviderDef = {
  id: string;
  name: string;
  lang?: ProviderLang | string;
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
  lang: ProviderLang;
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
  const lang: ProviderLang = (def.lang as ProviderLang) || DEFAULT_PROVIDER_LANGS[def.id] || "multi";
  return {
    id: def.id,
    name: def.name,
    lang,
    needsTmdb: !!def.needsTmdb,
    tvOk: !!def.tvOk,
    sandbox: def.sandbox || "",
    movie: (id) => fill(def.movie, id, 1, 1, key),
    tv: (id, s, e) => fill(def.tv, id, s, e, key),
  };
}

export function findBestProvider(
  list: Provider[],
  userLang: string,
  preferredId?: string | null
): Provider {
  if (!list.length) {
    return buildProvider({ id: "vidcore", name: "VidCore", movie: "", tv: "" });
  }

  // Si el preferredId existe en la lista y es compatible con el idioma del usuario, respetarlo
  if (preferredId) {
    const found = list.find((p) => p.id === preferredId);
    if (found) {
      if (userLang === "es" && (found.lang === "es" || found.lang === "lat" || found.lang === "multi")) {
        return found;
      }
      if (userLang === "pt" && (found.lang === "pt" || found.lang === "multi")) {
        return found;
      }
      if (userLang === "en" && (found.lang === "en" || found.lang === "multi")) {
        return found;
      }
    }
  }

  // 1. Coincidencia directa por idioma de la app
  if (userLang === "es") {
    const es = list.find((p) => p.lang === "es" || p.lang === "lat");
    if (es) return es;
  } else if (userLang === "pt") {
    const pt = list.find((p) => p.lang === "pt");
    if (pt) return pt;
  } else if (userLang === "en") {
    const en = list.find((p) => p.lang === "en");
    if (en) return en;
  }

  // 2. Multi-idioma
  const multi = list.find((p) => p.lang === "multi");
  if (multi) return multi;

  // 3. Fallback al primer proveedor
  return list[0];
}

export function sortProvidersByLang(list: Provider[], userLang: string): Provider[] {
  return [...list].sort((a, b) => {
    const score = (p: Provider) => {
      if (userLang === "es") {
        if (p.lang === "es") return 3;
        if (p.lang === "lat") return 2;
        if (p.lang === "multi") return 1;
        return 0;
      }
      if (userLang === "pt") {
        if (p.lang === "pt") return 3;
        if (p.lang === "multi") return 1;
        return 0;
      }
      if (userLang === "en") {
        if (p.lang === "en") return 3;
        if (p.lang === "multi") return 1;
        return 0;
      }
      return 0;
    };
    return score(b) - score(a);
  });
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
    list: c.providers.map((d: any) => buildProvider({ id: d.id, name: d.name, lang: d.lang, needsTmdb: d.needsTmdb, tvOk: d.tvOk, movie: "", tv: "" }, "")),
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
