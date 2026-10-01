/**
 * Motor Dinámico de Extracción de Streams HLS (Spec 097)
 * Arquitectura de Pipeline Declarativo en JSON:
 * Toda la lógica de extracción (peticiones HTTP, filtrado de arrays, desofuscación Packer,
 * regex y mapeo de subtítulos) reside en configuraciones JSON editables en vivo desde /admin.
 */

import { fetchCinecalidadStream } from "./cinecalidad";
import { fetchNasriPlayStream } from "./nasriplay";
import { fetchMegaEmbedStream } from "./megaembed";
import { fetchWatchPlayStream } from "./watchplay";

export interface PipelineStep {
  id: string;
  action:
    | "http_request"
    | "find_in_array"
    | "unpack_packer"
    | "regex_extract"
    | "json_path"
    | "extract_subtitles_vimeos"
    | "direct_url"
    | "nasriplay_resolve_servers"
    | "extract_megaembed"
    | "extract_watchplay";
  url?: string;
  movie_url?: string;
  tv_url?: string;
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: any;
  response_type?: "json" | "text";
  timeout_ms?: number;
  required?: boolean;

  // Filtrado de arrays (find_in_array)
  input?: string; // ej. "{{api_playback.embeds}}"
  match?: Record<string, any>; // ej. { "url_contains": "vimeos" }
  select?: string; // ej. "url"

  // Regex
  pattern?: string;
  group?: number;
  flags?: string;

  // JSON path
  path?: string;
}

export interface PipelineOutput {
  hlsUrl: string;
  backupHlsUrls?: string | string[];
  subtitles?: string;
  embeds?: string;
  title?: string;
}

export interface StepTrace {
  stepId: string;
  action: string;
  success: boolean;
  durationMs: number;
  summary?: string;
  error?: string;
}

export interface ExtractorConfig {
  version?: number;
  mode?: "pipeline" | "legacy";
  preset?: "vimeos_json" | "nasriplay_token" | "playerflix" | "megaembed" | "watchplay" | "direct_m3u8" | "custom_api";
  steps?: PipelineStep[];
  output?: PipelineOutput;
  movie_api_url?: string;
  tv_api_url?: string;
  request?: {
    method?: "GET" | "POST";
    headers?: Record<string, string>;
  };
  mapping?: {
    hls_regex?: string;
    json_path?: string;
    backup_paths?: string[];
    embeds_path?: string;
  };
  options?: {
    timeout_ms?: number;
    cors_proxy?: boolean;
  };
}

export interface HlsExtractionResult {
  success: boolean;
  hlsUrl?: string;
  backupHlsUrls?: string[];
  embeds?: Array<{
    name: string;
    server?: string;
    host?: string;
    language?: string;
    url: string;
  }>;
  subtitles?: Array<{
    file: string;
    label: string;
    kind?: string;
    default?: boolean;
  }>;
  title?: string;
  error?: string;
  durationMs: number;
  status?: number;
  stepTraces?: StepTrace[];
}

export interface RunHlsExtractorParams {
  providerId: string;
  config?: ExtractorConfig;
  movieTpl?: string;
  tvTpl?: string;
  type: "movie" | "tv";
  id: string; // TMDB ID
  season?: number;
  episode?: number;
}

/**
 * Desempaqueta scripts ofuscados con Dean Edwards Packer: eval(function(p,a,c,k,e,d)...)
 * Implementación 100% segura basada en reemplazo de cadenas sin invocar eval().
 */
export function unpackPackerScript(packed: string): string | null {
  if (!packed || typeof packed !== "string") return null;
  const regex = /eval\(function\(p,a,c,k,e,d\)\{[\s\S]*?\}\('([\s\S]*?)',(\d+),(\d+),'([\s\S]*?)'\.split\('\|'\)/;
  let match = packed.match(regex);
  if (!match) {
    const altRegex = /eval\(function\(p,a,c,k,e,d\)\{[\s\S]*?\}\("([\s\S]*?)",(\d+),(\d+),"([\s\S]*?)"\.split\('\|'\)/;
    match = packed.match(altRegex);
  }
  if (!match) return null;

  let [_, p, aStr, cStr, kStr] = match;
  let a = parseInt(aStr, 10);
  let c = parseInt(cStr, 10);
  const k = kStr.split("|");

  while (c--) {
    if (k[c]) {
      p = p.replace(new RegExp('\\b' + c.toString(a) + '\\b', 'g'), k[c]);
    }
  }
  return p;
}

/**
 * Extrae pistas de subtítulos dentro del código JS de reproductores Vimeos
 */
export function extractVimeosTracks(unpackedCode: string): any[] {
  if (!unpackedCode || typeof unpackedCode !== "string") return [];
  const subtitles: any[] = [];
  const tracksMatch = unpackedCode.match(/tracks\s*:\s*\[([\s\S]*?)\]/);
  if (tracksMatch && tracksMatch[1]) {
    const trackRegex = /\{file:\s*"([^"]+)",label:\s*"([^"]+)"(?:,kind:\s*"([^"]+)")?(?:,"default":\s*(true|false))?\}/g;
    let tm;
    while ((tm = trackRegex.exec(tracksMatch[1])) !== null) {
      if (tm[1] && !tm[1].includes("empty.srt")) {
        subtitles.push({
          file: tm[1],
          label: tm[2] || "Subtítulo",
          kind: tm[3] || "captions",
          default: tm[4] === "true",
        });
      }
    }
  }
  return subtitles;
}

/**
 * Resuelve una ruta anidada en un objeto JSON (ej: "data.embeds.0.url" o "data.stream")
 */
export function getByPath(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  const parts = path.replace(/\[(\w+)\]/g, ".$1").replace(/^\./, "").split(".");
  let curr = obj;
  for (const part of parts) {
    if (curr === null || curr === undefined) return undefined;
    curr = curr[part];
  }
  return curr;
}

/**
 * Reemplaza tokens de plantilla en cadenas
 */
function resolveTemplate(tpl: string, ctx: Record<string, any>): string {
  if (!tpl || typeof tpl !== "string") return tpl;
  let res = tpl
    .replace(/\{id\}/g, String(ctx.id || ""))
    .replace(/\{tmdb\}/g, String(ctx.id || ""))
    .replace(/\{s\}/g, String(ctx.season || ctx.s || 1))
    .replace(/\{e\}/g, String(ctx.episode || ctx.e || 1))
    .replace(/\{season\}/g, String(ctx.season || ctx.s || 1))
    .replace(/\{episode\}/g, String(ctx.episode || ctx.e || 1))
    .replace(/\{type\}/g, String(ctx.type || "movie"))
    .replace(/\{movie_tpl\}/g, String(ctx.movieTpl || ""))
    .replace(/\{tv_tpl\}/g, String(ctx.tvTpl || ""));

  res = res.replace(/\{\{([a-zA-Z0-9_\.]+)\}\}/g, (_, path) => {
    const val = getByPath(ctx, path);
    return val !== undefined && val !== null ? String(val) : "";
  });

  return res;
}

/**
 * Resuelve un valor que puede ser una referencia completa (ej: "{{api_playback.embeds}}")
 */
function resolveValue(expr: any, ctx: Record<string, any>): any {
  if (typeof expr !== "string") return expr;
  const exactMatch = expr.match(/^\{\{([a-zA-Z0-9_\.]+)\}\}$/);
  if (exactMatch) {
    return getByPath(ctx, exactMatch[1]);
  }
  return resolveTemplate(expr, ctx);
}

/**
 * Comprueba si un elemento coincide con criterios de búsqueda
 */
function matchItem(item: any, matchCriteria?: Record<string, any>): boolean {
  if (!item || !matchCriteria) return true;
  for (const [key, expected] of Object.entries(matchCriteria)) {
    if (key.endsWith("_contains")) {
      const propName = key.replace("_contains", "");
      const val = String(item[propName] || "").toLowerCase();
      if (!val.includes(String(expected).toLowerCase())) return false;
    } else if (key.endsWith("_equals")) {
      const propName = key.replace("_equals", "");
      if (item[propName] !== expected) return false;
    } else {
      if (item[key] !== expected && String(item[key]).toLowerCase() !== String(expected).toLowerCase()) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Ejecuta un paso individual del pipeline
 */
async function executeStep(step: PipelineStep, ctx: Record<string, any>): Promise<any> {
  const timeoutMs = step.timeout_ms || 8000;

  switch (step.action) {
    case "http_request": {
      const rawUrl =
        ctx.type === "tv"
          ? (step.tv_url || step.url || ctx.tvTpl)
          : (step.movie_url || step.url || ctx.movieTpl);

      if (!rawUrl) {
        throw new Error("No hay URL configurada para la petición HTTP");
      }

      const finalUrl = resolveTemplate(rawUrl, ctx);
      const headers: Record<string, string> = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      };

      if (step.headers) {
        for (const [k, v] of Object.entries(step.headers)) {
          headers[k] = resolveTemplate(v, ctx);
        }
      }

      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);

      try {
        const res = await fetch(finalUrl, {
          method: step.method || "GET",
          headers,
          body: step.body ? (typeof step.body === "string" ? resolveTemplate(step.body, ctx) : JSON.stringify(step.body)) : undefined,
          signal: ctrl.signal,
          cache: "no-store",
        });

        if (!res.ok && step.required !== false) {
          throw new Error(`HTTP ${res.status} al consultar ${finalUrl}`);
        }

        const isJson = step.response_type === "json" || (step.response_type !== "text" && (res.headers.get("content-type") || "").includes("json"));
        if (isJson) {
          return await res.json();
        }
        return await res.text();
      } finally {
        clearTimeout(timer);
      }
    }

    case "find_in_array": {
      const rawArr = resolveValue(step.input, ctx);
      if (!Array.isArray(rawArr)) {
        throw new Error(`La entrada para find_in_array no es un arreglo: ${typeof rawArr}`);
      }
      const found = rawArr.find((item) => matchItem(item, step.match));
      if (!found) {
        if (step.required !== false) {
          throw new Error("No se encontró ningún elemento coincidente en el arreglo");
        }
        return null;
      }
      return step.select ? found[step.select] : found;
    }

    case "unpack_packer": {
      const inputStr = String(resolveValue(step.input, ctx) || "");
      const unpacked = unpackPackerScript(inputStr);
      if (!unpacked) {
        throw new Error("No se encontró script ofuscado con Packer o falló el desempaquetado");
      }
      return unpacked;
    }

    case "regex_extract": {
      const inputStr = String(resolveValue(step.input, ctx) || "");
      if (!step.pattern) throw new Error("Falta pattern para regex_extract");
      const re = new RegExp(step.pattern, step.flags || "i");
      const match = inputStr.match(re);
      if (!match) {
        if (step.required !== false) {
          throw new Error(`La expresión regular no coincidió con el contenido: ${step.pattern}`);
        }
        return null;
      }
      const grp = step.group !== undefined ? step.group : 0;
      return match[grp] !== undefined ? match[grp] : match[0];
    }

    case "json_path": {
      const inputObj = resolveValue(step.input, ctx);
      if (!step.path) throw new Error("Falta path para json_path");
      return getByPath(inputObj, step.path);
    }

    case "extract_subtitles_vimeos": {
      const inputStr = String(resolveValue(step.input, ctx) || "");
      return extractVimeosTracks(inputStr);
    }

    case "direct_url": {
      const raw = ctx.type === "tv" ? (step.tv_url || step.url || ctx.tvTpl) : (step.movie_url || step.url || ctx.movieTpl);
      return resolveTemplate(raw || "", ctx);
    }

    case "nasriplay_resolve_servers": {
      const rawServers = resolveValue(step.input, ctx);
      if (!Array.isArray(rawServers) || rawServers.length === 0) {
        throw new Error("No se recibieron servidores de NasriPlay");
      }
      // Extraer streams directos HLS y mirrors con failover
      const validStreams: string[] = [];
      for (const srv of rawServers) {
        if (srv.token) {
          validStreams.push(`https://nsrplay.space/api/v1/embed/stream-proxy?token=${encodeURIComponent(srv.token)}`);
        } else if (srv.playUrl && srv.playUrl.includes(".m3u8")) {
          validStreams.push(srv.playUrl);
        } else if (srv.url && srv.url.includes(".m3u8")) {
          validStreams.push(srv.url);
        }
      }

      const primaryHls = validStreams[0] || "";
      const backupHls = validStreams.slice(1);

      const embeds = rawServers.map((s: any, idx: number) => ({
        name: s.name || s.server || `Mirror ${idx + 1}`,
        server: s.server || "nsrplay",
        host: s.server ? s.server.charAt(0).toUpperCase() + s.server.slice(1) : "NasriPlay",
        language: s.language || "Latino",
        url: s.url || `https://nsrplay.space/embed/movie/${ctx.id}`,
      }));

      return {
        hlsUrl: primaryHls,
        backupHlsUrls: backupHls,
        embeds,
      };
    }

    case "extract_megaembed": {
      const res = await fetchMegaEmbedStream({ id: ctx.id, type: ctx.type, season: ctx.season, episode: ctx.episode });
      if (!res?.success || !res.hlsUrl) throw new Error(res?.error || "MegaEmbed no devolvió stream directo");
      return res;
    }

    case "extract_watchplay": {
      const res = await fetchWatchPlayStream({ id: ctx.id, type: ctx.type, season: ctx.season, episode: ctx.episode });
      if (!res?.success || !res.hlsUrl) throw new Error(res?.error || "WatchPlay no devolvió stream directo");
      return res;
    }

    default:
      throw new Error(`Acción desconocida en el pipeline: ${(step as any).action}`);
  }
}

/**
 * Genera un resumen legible de la salida de un paso para la traza de diagnóstico
 */
function formatStepSummary(action: string, out: any): string {
  if (out === null || out === undefined) return "Sin resultado";
  if (typeof out === "string") {
    if (out.includes(".m3u8")) return `Stream HLS detectado: ${out.substring(0, 60)}...`;
    if (out.length > 80) return `Texto (${out.length} caracteres)`;
    return out;
  }
  if (Array.isArray(out)) {
    return `Arreglo con ${out.length} elementos`;
  }
  if (typeof out === "object") {
    if (out.hlsUrl) return `HLS obtenido (${out.backupHlsUrls?.length || 0} backups)`;
    return `Objeto JSON (${Object.keys(out).length} propiedades)`;
  }
  return String(out);
}

/**
 * Ejecuta un pipeline declarativo completo
 */
export async function executePipeline(
  config: ExtractorConfig,
  params: RunHlsExtractorParams
): Promise<HlsExtractionResult> {
  const startTime = Date.now();
  const stepTraces: StepTrace[] = [];
  const ctx: Record<string, any> = {
    id: params.id,
    tmdbId: params.id,
    type: params.type,
    season: params.season || 1,
    episode: params.episode || 1,
    s: params.season || 1,
    e: params.episode || 1,
    providerId: params.providerId,
    movieTpl: params.movieTpl,
    tvTpl: params.tvTpl,
  };

  const steps = config.steps || [];
  for (const step of steps) {
    const stepStart = Date.now();
    try {
      const out = await executeStep(step, ctx);
      ctx[step.id] = out;
      stepTraces.push({
        stepId: step.id,
        action: step.action,
        success: true,
        durationMs: Date.now() - stepStart,
        summary: formatStepSummary(step.action, out),
      });
    } catch (err: any) {
      stepTraces.push({
        stepId: step.id,
        action: step.action,
        success: false,
        durationMs: Date.now() - stepStart,
        error: err?.message || String(err),
      });

      if (step.required !== false) {
        return {
          success: false,
          error: `Error en paso [${step.id}]: ${err?.message || err}`,
          durationMs: Date.now() - startTime,
          stepTraces,
        };
      }
    }
  }

  // Ensamblar salida según el mapeo 'output'
  const outputDef = config.output || {
    hlsUrl: "{{hls_stream}}",
    backupHlsUrls: "{{backup_hls_streams}}",
    subtitles: "{{subtitles}}",
    embeds: "{{api_playback.embeds}}",
  };

  const hlsUrl = resolveValue(outputDef.hlsUrl, ctx);
  const backupHlsUrls = resolveValue(outputDef.backupHlsUrls, ctx);
  const subtitles = resolveValue(outputDef.subtitles, ctx);
  const embeds = resolveValue(outputDef.embeds, ctx);
  const title = resolveValue(outputDef.title, ctx);

  let cleanBackups: string[] = [];
  if (Array.isArray(backupHlsUrls)) {
    cleanBackups = backupHlsUrls.map(String).filter((u) => u.startsWith("http"));
  } else if (backupHlsUrls && typeof backupHlsUrls === "string" && backupHlsUrls.startsWith("http")) {
    cleanBackups = [backupHlsUrls];
  }

  const durationMs = Date.now() - startTime;

  if (hlsUrl && typeof hlsUrl === "string" && (hlsUrl.startsWith("http") || hlsUrl.startsWith("/api"))) {
    return {
      success: true,
      hlsUrl,
      backupHlsUrls: cleanBackups,
      subtitles: Array.isArray(subtitles) ? subtitles : undefined,
      embeds: Array.isArray(embeds) ? embeds : undefined,
      title: title ? String(title) : undefined,
      durationMs,
      stepTraces,
    };
  }

  return {
    success: false,
    embeds: Array.isArray(embeds) ? embeds : undefined,
    error: hlsUrl ? `URL HLS inválida o no reproducible: ${hlsUrl}` : "No se extrajo ninguna URL HLS válida en el pipeline",
    durationMs,
    stepTraces,
  };
}

/**
 * Diccionario de Recetas / Presets de Pipeline Declarativo JSON
 * Cada preset contiene la lógica íntegra de extracción en formato JSON sin código estático en el servidor.
 */
export const EXTRACTOR_PRESETS: Record<string, { label: string; description: string; template: ExtractorConfig }> = {
  vimeos_json: {
    label: "Cinecalidad (AllCalidad / Vimeos HLS Pipeline)",
    description: "Pipeline declarativo completo: consulta endpoint REST, extrae embed de Vimeos, desofusca script Packer y obtiene stream .m3u8 nativo con subtítulos.",
    template: {
      version: 2,
      mode: "pipeline",
      preset: "vimeos_json",
      steps: [
        {
          id: "api_playback",
          action: "http_request",
          movie_url: "https://tmdb.allcalidad.re/v1/playback/movie/{id}",
          tv_url: "https://tmdb.allcalidad.re/v1/playback/tvshow/{id}?season={s}&episode={e}",
          method: "GET",
          headers: {
            "Referer": "https://cinecalidad.am/",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
          },
          response_type: "json",
          timeout_ms: 7000
        },
        {
          id: "vimeos_embed",
          action: "find_in_array",
          input: "{{api_playback.embeds}}",
          match: { "url_contains": "vimeos" },
          select: "url"
        },
        {
          id: "vimeos_html",
          action: "http_request",
          url: "{{vimeos_embed}}",
          method: "GET",
          headers: {
            "Referer": "https://cinecalidad.am/",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
          },
          response_type: "text",
          timeout_ms: 7000
        },
        {
          id: "unpacked_js",
          action: "unpack_packer",
          input: "{{vimeos_html}}"
        },
        {
          id: "hls_stream",
          action: "regex_extract",
          input: "{{unpacked_js}}",
          pattern: "https?:\\/\\/[^\\s\"']+\\.m3u8[^\\s\"']*",
          group: 0
        },
        {
          id: "subtitles",
          action: "extract_subtitles_vimeos",
          input: "{{unpacked_js}}",
          required: false
        }
      ],
      output: {
        hlsUrl: "{{hls_stream}}",
        backupHlsUrls: [],
        subtitles: "{{subtitles}}",
        embeds: "{{api_playback.embeds}}"
      }
    }
  },
  nasriplay_token: {
    label: "NasriPlay (Token Chain + Multi-Mirror Pipeline)",
    description: "Pipeline declarativo completo: extrae PAGE_TOKEN del iframe, consulta API de fuentes autorizadas y genera streams directos con failover multi-mirror.",
    template: {
      version: 2,
      mode: "pipeline",
      preset: "nasriplay_token",
      steps: [
        {
          id: "embed_page",
          action: "http_request",
          movie_url: "https://nsrplay.space/embed/movie/{id}",
          tv_url: "https://nsrplay.space/embed/tv/{id}/{s}/{e}",
          method: "GET",
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
          },
          response_type: "text",
          timeout_ms: 7000
        },
        {
          id: "page_token",
          action: "regex_extract",
          input: "{{embed_page}}",
          pattern: "PAGE_TOKEN\\s*=\\s*[\"']([^\"']+)[\"']",
          group: 1
        },
        {
          id: "sources_api",
          action: "http_request",
          movie_url: "https://nsrplay.space/api/v1/embed/sources/movie/{id}?pt={{page_token}}",
          tv_url: "https://nsrplay.space/api/v1/embed/sources/tv/{id}/{s}/{e}?pt={{page_token}}",
          method: "GET",
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Referer": "https://nsrplay.space/embed/movie/{id}"
          },
          response_type: "json",
          timeout_ms: 7000
        },
        {
          id: "nasri_streams",
          action: "nasriplay_resolve_servers",
          input: "{{sources_api.servers}}"
        }
      ],
      output: {
        hlsUrl: "{{nasri_streams.hlsUrl}}",
        backupHlsUrls: "{{nasri_streams.backupHlsUrls}}",
        embeds: "{{nasri_streams.embeds}}"
      }
    }
  },
  playerflix: {
    label: "PlayerFlix (API fMP4 / HLS Pipeline)",
    description: "Pipeline proxy directo hacia el endpoint optimizado de PlayerFlix con redirect y streaming HLS nativo.",
    template: {
      version: 2,
      mode: "pipeline",
      preset: "playerflix",
      steps: [
        {
          id: "playerflix_direct",
          action: "direct_url",
          movie_url: "/api/playerflix?type=movie&id={id}&redirect=1",
          tv_url: "/api/playerflix?type=tv&id={id}&s={s}&e={e}&redirect=1"
        }
      ],
      output: {
        hlsUrl: "{{playerflix_direct}}"
      }
    }
  },
  megaembed: {
    label: "MegaEmbed (fMP4 con bypass)",
    description: "Pipeline con extractor fMP4 y headers de bypass para MegaEmbed.",
    template: {
      version: 2,
      mode: "pipeline",
      preset: "megaembed",
      steps: [
        {
          id: "megaembed_stream",
          action: "extract_megaembed",
          movie_url: "https://mgeb.top/embed/{id}",
          tv_url: "https://mgeb.top/embed/{id}/{s}/{e}"
        }
      ],
      output: {
        hlsUrl: "{{megaembed_stream.hlsUrl}}",
        backupHlsUrls: "{{megaembed_stream.backupHlsUrls}}"
      }
    }
  },
  watchplay: {
    label: "WatchPlay (fMP4 Portugués)",
    description: "Pipeline para extracción de streams HLS nativos de WatchPlay.",
    template: {
      version: 2,
      mode: "pipeline",
      preset: "watchplay",
      steps: [
        {
          id: "watchplay_stream",
          action: "extract_watchplay",
          movie_url: "https://v2.watchplay.shop/movie/{id}",
          tv_url: "https://v2.watchplay.shop/tvshow/{id}/{s}/{e}"
        }
      ],
      output: {
        hlsUrl: "{{watchplay_stream.hlsUrl}}",
        backupHlsUrls: "{{watchplay_stream.backupHlsUrls}}"
      }
    }
  },
  direct_m3u8: {
    label: "Directo (.m3u8 / Stream URL)",
    description: "La plantilla de URL devuelve directamente una URL de stream HLS reproducible sin pasos intermedios.",
    template: {
      version: 2,
      mode: "pipeline",
      preset: "direct_m3u8",
      steps: [
        {
          id: "direct_stream",
          action: "direct_url",
          movie_url: "{movie_tpl}",
          tv_url: "{tv_tpl}"
        }
      ],
      output: {
        hlsUrl: "{{direct_stream}}"
      }
    }
  },
  custom_api: {
    label: "Personalizado (API JSON / Regex)",
    description: "Realiza una petición HTTP personalizada y extrae la URL del stream mediante JSONPath o Expresión Regular.",
    template: {
      version: 2,
      mode: "pipeline",
      preset: "custom_api",
      steps: [
        {
          id: "custom_request",
          action: "http_request",
          movie_url: "https://api.ejemplo.com/stream?id={id}",
          tv_url: "https://api.ejemplo.com/stream?id={id}&season={s}&episode={e}",
          method: "GET",
          headers: {
            "Accept": "application/json"
          },
          response_type: "json"
        },
        {
          id: "stream_path",
          action: "json_path",
          input: "{{custom_request}}",
          path: "data.stream_url"
        }
      ],
      output: {
        hlsUrl: "{{stream_path}}"
      }
    }
  }
};

/**
 * Ejecuta la extracción de streams HLS utilizando la configuración dinámica del proveedor.
 * Si el proveedor define `steps` o `mode === 'pipeline'`, ejecuta el pipeline declarativo.
 */
export async function runHlsExtractor(params: RunHlsExtractorParams): Promise<HlsExtractionResult> {
  const startTime = Date.now();
  const { providerId, config, movieTpl, tvTpl, type, id, season = 1, episode = 1 } = params;

  if (!id) {
    return {
      success: false,
      error: "ID TMDB faltante",
      durationMs: Date.now() - startTime,
    };
  }

  // 1. Si config tiene steps declarativos definidos, ejecutar el Pipeline Declarativo
  if (config?.steps && Array.isArray(config.steps) && config.steps.length > 0) {
    return executePipeline(config, params);
  }

  // 2. Si tiene un preset reconocido, usar el template de pipeline del preset
  const presetKey = config?.preset || (
    providerId === "cinecalidad" ? "vimeos_json" :
    providerId === "nasriplay" ? "nasriplay_token" :
    providerId === "playerflix" ? "playerflix" :
    providerId === "megaembed" ? "megaembed" :
    (providerId === "watchplay" || providerId === "EmbedMovies-V2") ? "watchplay" :
    "direct_m3u8"
  );

  const presetTemplate = EXTRACTOR_PRESETS[presetKey]?.template;
  if (presetTemplate?.steps && presetTemplate.steps.length > 0) {
    return executePipeline(presetTemplate, params);
  }

  // 3. Fallback de retrocompatibilidad directa
  const tpl = type === "tv" ? (config?.tv_api_url || tvTpl) : (config?.movie_api_url || movieTpl);
  if (tpl) {
    const directUrl = resolveTemplate(tpl, { id, season, episode, type, s: season, e: episode });
    return {
      success: true,
      hlsUrl: directUrl,
      backupHlsUrls: [],
      durationMs: Date.now() - startTime,
    };
  }

  return {
    success: false,
    error: "No se configuró pipeline ni plantilla de URL para este proveedor",
    durationMs: Date.now() - startTime,
  };
}
