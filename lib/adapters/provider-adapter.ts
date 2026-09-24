import {
  parseLangs,
  parseSubs,
  SUBTITLE_LANGS,
  type ProviderDef,
  type ProviderLang,
} from "@/lib/providers";
import {
  type Source,
  type SourceStreamType,
  type SourceSubtitle,
  scoreSourceForUser,
  sortSourcesByPriority,
} from "@/lib/sources";

/**
 * Interpola los marcadores de posición estándar de TVShow en las URLs de plantilla:
 * - {id}: ID de la obra (IMDb tt... o TMDB)
 * - {s}: Temporada (número)
 * - {e}: Episodio (número)
 * - {key}: Llave de acceso de la API / servidor
 * - {idparam}: Parámetro condicional "imdb=tt... | tmdb=..."
 * - {tmdbflag}: Parámetro condicional "&tmdb=1" para servidores que lo requieren
 * - {lang} / {language} / {locale}: Código de idioma o locale regional (e.g. es-ES, pt-BR, en para Stellar)
 */
export function fillTemplate(
  tpl: string,
  id: string,
  s: number = 1,
  e: number = 1,
  key: string = "",
  userLang: string = "es"
): string {
  if (!tpl) return "";
  const idparam = id.startsWith("tt") ? `imdb=${id}` : `tmdb=${id}`;
  const tmdbflag = id.startsWith("tt") ? "" : "&tmdb=1";

  // Mapeo inteligente de locale regional para servidores que lo soportan (e.g. Stellar)
  const cleanLang = (userLang || "es").toLowerCase().trim();
  let localeCode = "en";
  if (cleanLang === "es" || cleanLang === "castellano" || cleanLang === "español") {
    localeCode = "es-ES";
  } else if (cleanLang === "lat" || cleanLang === "latino") {
    localeCode = "es-419";
  } else if (cleanLang === "pt" || cleanLang === "portugues" || cleanLang === "português") {
    localeCode = "pt-BR";
  } else if (["en", "fr", "de", "it", "ru", "ja", "ko", "zh-CN", "zh-TW", "fil", "hi", "ar", "nl"].includes(cleanLang)) {
    localeCode = cleanLang;
  } else {
    localeCode = "en";
  }

  let result = tpl
    .split("{id}").join(id)
    .split("{s}").join(String(s))
    .split("{e}").join(String(e))
    .split("{key}").join(key)
    .split("{idparam}").join(idparam)
    .split("{tmdbflag}").join(tmdbflag)
    .split("{lang}").join(localeCode)
    .split("{language}").join(localeCode)
    .split("{locale}").join(localeCode);

  // Auto-adaptación si la URL fija de stellar.rip no tiene placeholder {lang}
  if (result.includes("stellar.rip/en/") && (cleanLang.startsWith("es") || cleanLang.startsWith("pt") || cleanLang === "lat")) {
    result = result.replace("stellar.rip/en/", `stellar.rip/${localeCode}/`);
  }

  return result;
}

/**
 * Detecta el tipo de stream a partir de la URL o propiedades explícitas.
 */
export function detectStreamType(url: string, explicitType?: string): SourceStreamType {
  if (explicitType && ["iframe", "hls", "dash", "mp4"].includes(explicitType)) {
    return explicitType as SourceStreamType;
  }
  const clean = url.toLowerCase().split("?")[0];
  if (clean.endsWith(".m3u8")) return "hls";
  if (clean.endsWith(".mpd")) return "dash";
  if (clean.endsWith(".mp4")) return "mp4";
  return "iframe";
}

/**
 * Normaliza la lista de subtítulos crudos en objetos SourceSubtitle enriquecidos.
 */
export function formatSubtitles(rawSubs: any, fallbackId = ""): SourceSubtitle[] {
  const list = parseSubs(rawSubs, fallbackId);
  return list.map((subId) => {
    const meta = SUBTITLE_LANGS.find((m) => m.id === subId);
    return {
      id: subId,
      lang: subId,
      label: meta ? `${meta.flag} ${meta.name}` : subId.toUpperCase(),
    };
  });
}

export interface ProviderAdapterInput {
  id: string;
  name: string;
  real_name?: string;
  simulated_name?: string;
  ord?: number;
  lang?: any;
  languages?: any;
  subtitles?: any;
  is_beta?: boolean;
  needs_tmdb?: boolean;
  needsTmdb?: boolean;
  tv_ok?: boolean;
  tvOk?: boolean;
  movie_tpl?: string;
  movie?: string;
  tv_tpl?: string;
  tv?: string;
  entry_key?: string;
  key?: string;
  sandbox?: string;
  stream_type?: string;
}

export interface AdapterQueryContext {
  type: "movie" | "tv";
  id: string; // ID efectivo para este proveedor (IMDb o TMDB resuelto)
  season?: number;
  episode?: number;
  userLang?: string;
  envKey?: string;
}

/**
 * Adapta un registro de proveedor a una fuente normalizada `Source`.
 * Devuelve `null` si el proveedor no soporta el tipo de contenido o no tiene plantilla válida.
 */
export function providerToSource(
  provider: ProviderAdapterInput,
  ctx: AdapterQueryContext
): Source | null {
  const isTv = ctx.type === "tv";
  const s = ctx.season || 1;
  const e = ctx.episode || 1;
  const tvOk = provider.tv_ok !== undefined ? !!provider.tv_ok : !!provider.tvOk;

  const rawTpl = isTv
    ? provider.tv_tpl || provider.tv
    : provider.movie_tpl || provider.movie;

  // Si no tiene plantilla configurada para este tipo de contenido, descartar
  if (!rawTpl || typeof rawTpl !== "string" || !rawTpl.trim()) {
    return null;
  }

  const key = provider.entry_key || provider.key || ctx.envKey || "";
  const resolvedUrl = fillTemplate(rawTpl, ctx.id, s, e, key, ctx.userLang || "es");

  if (!resolvedUrl) {
    return null;
  }

  const languages = parseLangs(provider.languages || provider.lang, provider.id);
  const cleanUserLang = (ctx.userLang || "es").toLowerCase().trim();
  const primaryLang = languages.includes(cleanUserLang as any)
    ? (cleanUserLang as ProviderLang)
    : languages[0] || "multi";
  const subtitles = formatSubtitles(provider.subtitles, provider.id);
  const isBeta = !!provider.is_beta;
  const needsTmdb = provider.needs_tmdb !== undefined ? !!provider.needs_tmdb : !!provider.needsTmdb;

  const priority = scoreSourceForUser(
    { languages, lang: primaryLang, subtitles, isBeta },
    ctx.userLang || "es"
  );

  const streamType = detectStreamType(resolvedUrl, provider.stream_type);

  return {
    id: `${provider.id}-${streamType}`,
    providerId: provider.id,
    providerName: provider.simulated_name || provider.name,
    realName: provider.real_name || provider.name,
    ord: provider.ord,
    type: streamType,
    url: resolvedUrl,
    lang: primaryLang,
    languages,
    subtitles,
    priority,
    isBeta,
    needsTmdb,
    tvOk,
    sandbox: provider.sandbox,
  };
}

/**
 * Convierte una lista de proveedores en una lista homogénea de fuentes `Source[]`,
 * filtrando incompatibilidades y ordenando según prioridad para el idioma del usuario.
 */
export function providersToSources(
  providers: ProviderAdapterInput[],
  ctx: AdapterQueryContext
): Source[] {
  const sources: Source[] = [];

  for (const prov of providers) {
    const source = providerToSource(prov, ctx);
    if (source) {
      sources.push(source);
    }
  }

  return sortSourcesByPriority(sources, ctx.userLang || "es");
}
