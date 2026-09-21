import {
  type ProviderLang,
  getProviderLangMeta,
  scoreProviderForUser,
} from "@/lib/providers";

export type SourceStreamType = "iframe" | "hls" | "dash" | "mp4";

export type SourceQuality = "1080p" | "720p" | "480p" | "auto";

export interface SourceSubtitle {
  id: string;
  lang: string;
  label: string;
  url?: string;
  isDefault?: boolean;
}

export interface Source {
  id: string;                 // Identificador único (ej: "vidcore", "vidcore-hls")
  providerId: string;         // ID del proveedor subyacente (ej: "vidcore")
  providerName: string;       // Nombre para mostrar (ej: "S1", "Vidcore")
  realName?: string;          // Nombre real para admin/diagnóstico
  type: SourceStreamType;     // Tipo de fuente: iframe, hls, dash, mp4
  url: string;                // URL lista para reproducir o embeber
  quality?: SourceQuality;    // Calidad estimada o detectada
  lang: ProviderLang;         // Idioma primario
  languages: ProviderLang[];  // Todos los idiomas de audio soportados
  subtitles: SourceSubtitle[];// Subtítulos disponibles
  priority: number;           // Puntuación calculada según idioma y fiabilidad
  isBeta: boolean;            // Flag de servidor en pruebas
  needsTmdb?: boolean;        // Si requiere resolución a TMDB ID
  tvOk?: boolean;             // Si soporta series
  sandbox?: string;           // Atributos de sandbox recomendados para iframes
  headers?: Record<string, string>; // Cabeceras personalizadas para streams directos
}

export interface ResolveRequest {
  type: "movie" | "tv";
  id: string;                 // IMDb (tt...) o TMDB ID
  season?: number;
  episode?: number;
  userLang?: string;
}

export interface ResolveResponse {
  success: boolean;
  type: "movie" | "tv";
  id: string;
  effectiveTmdbId?: string;
  effectiveImdbId?: string;
  season?: number;
  episode?: number;
  sources: Source[];
  recommendedSourceId: string;
  version: string;
  error?: string;
}

/**
 * Calcula la puntuación de afinidad de una fuente para el idioma del usuario.
 * Respeta la misma escala probada de TVShow:
 * - Idioma nativo prioritario: 10 pts
 * - Idioma alternativo compatible (ej: lat para es): 9 pts
 * - Multi-idioma / dual: 7 pts
 * - Subtítulos en idioma de usuario: 5 pts
 * - Penalización para servidores beta (-10 pts) para no ser elegidos por defecto
 */
export function scoreSourceForUser(
  source: { languages?: ProviderLang[]; lang: ProviderLang; subtitles?: (SourceSubtitle | string)[]; isBeta?: boolean },
  userLang: string
): number {
  let score = 0;
  const langs = source.languages && source.languages.length > 0 ? source.languages : [source.lang];
  const subLangList: string[] = (source.subtitles || []).map((s) => (typeof s === "string" ? s : s.lang || s.id));

  const cleanLang = (userLang || "es").toLowerCase().trim();

  if (cleanLang === "es") {
    if (langs.includes("es")) score = Math.max(score, 10);
    if (langs.includes("lat")) score = Math.max(score, 9);
    if (langs.includes("multi")) score = Math.max(score, 7);
    if (subLangList.includes("es") || subLangList.includes("multi")) score = Math.max(score, 5);
  } else if (cleanLang === "pt") {
    if (langs.includes("pt")) score = Math.max(score, 10);
    if (langs.includes("multi")) score = Math.max(score, 7);
    if (subLangList.includes("pt") || subLangList.includes("multi")) score = Math.max(score, 5);
  } else if (cleanLang === "en") {
    if (langs.includes("en")) score = Math.max(score, 10);
    if (langs.includes("multi")) score = Math.max(score, 7);
    if (subLangList.includes("en") || subLangList.includes("multi")) score = Math.max(score, 5);
  } else {
    if (langs.includes("multi")) score = 5;
  }

  // Penalización para servidores Beta: nunca van por delante de un servidor estable
  if (source.isBeta) {
    score -= 10;
  }

  return score;
}

/**
 * Ordena las fuentes de mayor a menor prioridad según el idioma del usuario.
 * Garantiza estabilidad de orden si las puntuaciones son iguales.
 */
export function sortSourcesByPriority(sources: Source[], userLang: string): Source[] {
  return [...sources].sort((a, b) => {
    // 1. Los servidores no-beta tienen prioridad sobre los beta
    if (!!a.isBeta !== !!b.isBeta) {
      return a.isBeta ? 1 : -1;
    }
    // 2. Mayor prioridad calculada
    const scoreA = a.priority !== undefined ? a.priority : scoreSourceForUser(a, userLang);
    const scoreB = b.priority !== undefined ? b.priority : scoreSourceForUser(b, userLang);
    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }
    // 3. Empate: mantener orden original
    return 0;
  });
}

/**
 * Selecciona la mejor fuente recomendada para el usuario.
 */
export function findBestSource(sources: Source[], userLang: string): Source | undefined {
  if (!sources || sources.length === 0) return undefined;
  const sorted = sortSourcesByPriority(sources, userLang);
  return sorted[0];
}

/**
 * Obtiene insignia y etiquetas visuales de un tipo de stream para la interfaz de usuario.
 */
export function getStreamTypeMeta(type: SourceStreamType) {
  switch (type) {
    case "hls":
      return { label: "HLS Stream", badge: "HLS", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" };
    case "dash":
      return { label: "DASH Stream", badge: "DASH", color: "text-blue-400 bg-blue-500/10 border-blue-500/30" };
    case "mp4":
      return { label: "Direct MP4", badge: "MP4", color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30" };
    case "iframe":
    default:
      return { label: "Embed Player", badge: "EMBED", color: "text-zinc-400 bg-white/5 border-white/10" };
  }
}
