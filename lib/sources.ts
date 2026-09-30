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

export interface SourceEmbedOption {
  name: string;
  server?: string;
  host?: string;
  language?: string;
  url: string;
}

export interface Source {
  id: string;                 // Identificador único (ej: "vidcore", "vidcore-hls")
  providerId: string;         // ID del proveedor subyacente (ej: "vidcore")
  providerName: string;       // Nombre para mostrar (ej: "S1", "Vidcore")
  realName?: string;          // Nombre real para admin/diagnóstico
  ord?: number;               // ID persistente / número de orden en administración (ej: 1, 11)
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
  backupUrls?: string[];      // URLs de fallback para streams directos HLS/MP4
  urlServerMap?: Record<string, string>; // Mapeo de URL -> nombre de servidor (ej: "S14", "S19", "S17")
  embedOptions?: SourceEmbedOption[]; // Sub-proveedores/mirrors unificados para un mismo servidor
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
 * Determina si una fuente representa una pool unificada o stream directo HLS.
 */
export function isHlsPoolSource(s: Source): boolean {
  if (!s) return false;
  // Los servidores en modo beta NUNCA forman parte de la pool unificada (permitiendo su testeo individual)
  if (s.isBeta) return false;

  const idLower = (s.id || "").toLowerCase().trim();
  const provIdLower = (s.providerId || "").toLowerCase().trim();
  const nameLower = (s.providerName || "").toLowerCase().trim();
  const realNameLower = (s.realName || "").toLowerCase().trim();

  return (
    s.type === "hls" ||
    nameLower === "hls" ||
    realNameLower.includes("hls") ||
    idLower === "hls" ||
    idLower.startsWith("hls-") ||
    provIdLower === "hls" ||
    Boolean(s.urlServerMap && Object.keys(s.urlServerMap).length > 0)
  );
}

/**
 * Calcula la puntuación global de una fuente considerando afinidad de idioma y prioridad intrínseca.
 * La afinidad de idioma tiene peso predominante (* 1000) para garantizar que los servidores compatibles
 * siempre superen a los servidores en idiomas ajenos.
 */
export function getSourceTotalScore(s: Source, userLang: string): number {
  const langScore = scoreSourceForUser(s, userLang);
  const isCompatible = langScore > 0;
  const langWeight = isCompatible ? langScore * 1000 : 0;
  const intrinsicPriority = s.priority !== undefined ? s.priority : 10;
  const betaPenalty = s.isBeta ? -500 : 0;
  return langWeight + intrinsicPriority + betaPenalty;
}

/**
 * Ordena las fuentes de mayor a menor prioridad según el idioma del usuario y la preferencia administrativa.
 * REGLA ARQUITECTÓNICA ESTRICTA:
 * 1. Respetar siempre el idioma definido por el usuario (las fuentes compatibles siempre van primero).
 * 2. Si existe una Pool HLS compatible con el idioma del usuario, ESTA APARECE EN LA POSICIÓN 0.
 * 3. Se aplican prioridades de administración y ordenación determinista para el resto de fuentes.
 */
export function sortSourcesByPriority(
  sources: Source[],
  userLang: string,
  primaryByLang?: Record<string, string> | Record<string, string[] | string>
): Source[] {
  const cleanLang = (userLang || "").toLowerCase().trim();
  const rawPreference = primaryByLang?.[cleanLang];

  const priorityList: string[] = Array.isArray(rawPreference)
    ? rawPreference
    : typeof rawPreference === "string" && rawPreference.trim()
    ? [rawPreference.trim()]
    : [];

  const rankMap = new Map<string, number>();
  priorityList.forEach((pid, idx) => {
    if (pid) {
      const clean = pid.toLowerCase().trim();
      if (!rankMap.has(clean)) {
        rankMap.set(clean, idx);
      }
    }
  });

  return [...sources].sort((a, b) => {
    const isLangCompatA = scoreSourceForUser(a, userLang) > 0;
    const isLangCompatB = scoreSourceForUser(b, userLang) > 0;

    // 1. Compatibilidad lingüística absoluta: los idiomas compatibles SIEMPRE van antes que idiomas ajenos
    if (isLangCompatA !== isLangCompatB) {
      return isLangCompatA ? -1 : 1;
    }

    // 2. POSICIÓN 0 PARA POOL HLS:
    // Si tenemos una pool HLS compatible con el idioma del usuario, esa es la que TIENE QUE APARECER EN LA POSICIÓN 0
    const isPoolA = isHlsPoolSource(a);
    const isPoolB = isHlsPoolSource(b);

    if (isLangCompatA && isLangCompatB) {
      if (isPoolA !== isPoolB) {
        return isPoolA ? -1 : 1;
      }
    }

    // 3. Si el administrador definió una o más prioridades explícitas para este idioma
    if (rankMap.size > 0) {
      const getRank = (s: Source, isCompat: boolean): number => {
        // Los servidores en idiomas ajenos nunca deben beneficiarse de las prioridades de este idioma
        if (!isCompat) return Infinity;

        const idLower = (s.id || "").toLowerCase().trim();
        const provIdLower = (s.providerId || "").toLowerCase().trim();
        const isHls = isHlsPoolSource(s);

        // Si es un pool HLS y el admin configuró 'hls' como prioritario para este idioma:
        if (isHls && rankMap.has("hls")) {
          return rankMap.get("hls")!;
        }

        if (rankMap.has(idLower)) return rankMap.get(idLower)!;
        if (rankMap.has(provIdLower)) return rankMap.get(provIdLower)!;
        return Infinity;
      };

      const rankA = getRank(a, isLangCompatA);
      const rankB = getRank(b, isLangCompatB);

      if (rankA !== rankB) {
        return rankA < rankB ? -1 : 1;
      }
    }

    // 4. Si ninguna es compatible pero una es pool HLS fallback, priorizar el stream HLS
    if (!isLangCompatA && !isLangCompatB) {
      if (isPoolA !== isPoolB) {
        return isPoolA ? -1 : 1;
      }
    }

    // 5. Los servidores no-beta tienen prioridad sobre los beta
    if (!!a.isBeta !== !!b.isBeta) {
      return a.isBeta ? 1 : -1;
    }

    // 6. Puntuación calculada integrada (afinidad de idioma + prioridad intrínseca HLS/Iframe)
    const scoreA = getSourceTotalScore(a, userLang);
    const scoreB = getSourceTotalScore(b, userLang);
    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }

    // 7. Empate: mantener orden original determinista por ord (ord 0 para pools preservado)
    const ordA = typeof a.ord === "number" && !isNaN(a.ord) ? a.ord : 999;
    const ordB = typeof b.ord === "number" && !isNaN(b.ord) ? b.ord : 999;
    return ordA - ordB;
  });
}

/**
 * Selecciona la mejor fuente recomendada para el usuario.
 */
export function findBestSource(
  sources: Source[],
  userLang: string,
  primaryByLang?: Record<string, string> | Record<string, string[] | string>
): Source | undefined {
  if (!sources || sources.length === 0) return undefined;
  const sorted = sortSourcesByPriority(sources, userLang, primaryByLang);
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
