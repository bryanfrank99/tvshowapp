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

export const DEFAULT_PROVIDER_LANGS: Record<string, ProviderLang[]> = {
  vidcore: ["es", "en"],
  embos: ["lat", "es", "en"],
  streambetter: ["pt"],
  embedmovies: ["pt"],
  redeflix: ["pt"],
  pipocacine: ["pt", "lat"],
  vidapi: ["en"],
  vidzy: ["en", "es"],
  vimeus: ["en", "es", "lat"],
  superembed: ["en"],
  moviesapi: ["en"],
  cinesrc: ["en"],
  vidzee: ["en"],
};

export const DEFAULT_PROVIDER_SUBS: Record<string, string[]> = {
  vidcore: ["es", "en"],
  embos: ["es"],
  streambetter: ["pt"],
  embedmovies: ["pt"],
  redeflix: ["pt"],
  pipocacine: ["pt"],
  vidapi: ["es", "en", "pt"],
  vidzy: ["es", "en"],
  vimeus: ["es", "en"],
  superembed: ["es", "en"],
  moviesapi: ["en"],
  cinesrc: ["es", "en"],
  vidzee: ["es", "en"],
};

export const PROVIDER_LANGS: { id: ProviderLang; name: string; flag: string; badge: string }[] = [
  { id: "es", name: "Español (Castellano)", flag: "🇪🇸", badge: "ES" },
  { id: "lat", name: "Español (Latino)", flag: "🇲🇽", badge: "LAT" },
  { id: "multi", name: "Multi-idioma / Dual", flag: "🌐", badge: "MULTI" },
  { id: "en", name: "English (VO / Sub)", flag: "🇺🇸", badge: "EN" },
  { id: "pt", name: "Português", flag: "🇧🇷", badge: "PT" },
];

export const SUBTITLE_LANGS: { id: string; name: string; flag: string; badge: string }[] = [
  { id: "es", name: "Español", flag: "🇪🇸", badge: "ES" },
  { id: "en", name: "English", flag: "🇺🇸", badge: "EN" },
  { id: "pt", name: "Português", flag: "🇧🇷", badge: "PT" },
  { id: "multi", name: "Multi-subs", flag: "🌐", badge: "MULTI" },
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

export function parseLangs(val: any, fallbackId = ""): ProviderLang[] {
  if (Array.isArray(val) && val.length) return val as ProviderLang[];
  if (typeof val === "string" && val.trim()) {
    const arr = val.split(",").map((s) => s.trim().toLowerCase() as ProviderLang).filter(Boolean);
    if (arr.length) return arr;
  }
  return DEFAULT_PROVIDER_LANGS[fallbackId] || ["multi"];
}

export function parseSubs(val: any, fallbackId = ""): string[] {
  if (Array.isArray(val)) return val;
  if (typeof val === "string" && val.trim()) {
    return val.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  }
  return DEFAULT_PROVIDER_SUBS[fallbackId] || [];
}

export type ProviderDef = {
  id: string;
  name: string;
  lang?: string | string[];
  languages?: ProviderLang[];
  subtitles?: string | string[];
  is_beta?: boolean;
  needsTmdb?: boolean;
  tvOk?: boolean;
  movie: string;
  tv: string;
  key?: string;
  sandbox?: string;
};

export type Provider = {
  id: string;
  name: string;
  lang: ProviderLang;
  languages: ProviderLang[];
  subtitles: string[];
  is_beta: boolean;
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
  const languages = parseLangs(def.languages || def.lang, def.id);
  const subtitles = parseSubs(def.subtitles, def.id);
  const primaryLang = languages[0] || "multi";

  return {
    id: def.id,
    name: def.name,
    lang: primaryLang,
    languages,
    subtitles,
    is_beta: !!def.is_beta,
    needsTmdb: !!def.needsTmdb,
    tvOk: !!def.tvOk,
    sandbox: def.sandbox || "",
    movie: (id) => fill(def.movie, id, 1, 1, key),
    tv: (id, s, e) => fill(def.tv, id, s, e, key),
  };
}

export function scoreProviderForUser(p: Provider, userLang: string): number {
  let score = 0;
  const langs = p.languages || [p.lang];
  const subs = p.subtitles || [];

  if (userLang === "es") {
    if (langs.includes("es")) score = Math.max(score, 10);
    if (langs.includes("lat")) score = Math.max(score, 9);
    if (langs.includes("multi")) score = Math.max(score, 7);
    if (subs.includes("es") || subs.includes("multi")) score = Math.max(score, 5);
  } else if (userLang === "pt") {
    if (langs.includes("pt")) score = Math.max(score, 10);
    if (langs.includes("multi")) score = Math.max(score, 7);
    if (subs.includes("pt") || subs.includes("multi")) score = Math.max(score, 5);
  } else if (userLang === "en") {
    if (langs.includes("en")) score = Math.max(score, 10);
    if (langs.includes("multi")) score = Math.max(score, 7);
    if (subs.includes("en") || subs.includes("multi")) score = Math.max(score, 5);
  } else {
    if (langs.includes("multi")) score = 5;
  }
  return score;
}

export function findBestProvider(
  list: Provider[],
  userLang: string,
  preferredId?: string | null
): Provider {
  // Los proveedores BETA nunca se eligen por defecto al reproducir contenido
  const eligible = list.filter((p) => !p.is_beta);
  const pool = eligible.length > 0 ? eligible : list;

  if (!pool.length) {
    return buildProvider({ id: "vidcore", name: "VidCore", movie: "", tv: "" });
  }

  // Si el preferredId existe, NO es beta, y tiene audio o subtítulo compatible (score >= 5), respetarlo
  if (preferredId) {
    const found = pool.find((p) => p.id === preferredId && !p.is_beta);
    if (found && scoreProviderForUser(found, userLang) >= 5) {
      return found;
    }
  }

  let best = pool[0];
  let bestScore = -1;

  for (const p of pool) {
    const s = scoreProviderForUser(p, userLang);
    if (s > bestScore) {
      bestScore = s;
      best = p;
    }
  }

  return best;
}

export function sortProvidersByLang(list: Provider[], userLang: string): Provider[] {
  return [...list].sort((a, b) => {
    // Los proveedores regulares tienen prioridad sobre los Beta
    if (!!a.is_beta !== !!b.is_beta) {
      return a.is_beta ? 1 : -1;
    }
    const sa = scoreProviderForUser(a, userLang);
    const sb = scoreProviderForUser(b, userLang);
    return sb - sa;
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
    list: c.providers.map((d: any) =>
      buildProvider(
        {
          id: d.id,
          name: d.name,
          lang: d.lang,
          languages: d.languages,
          subtitles: d.subtitles,
          is_beta: d.is_beta,
          needsTmdb: d.needsTmdb,
          tvOk: d.tvOk,
          movie: "",
          tv: "",
        },
        ""
      )
    ),
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
