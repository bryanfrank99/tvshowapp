"use client";
import { getProviderLangMeta } from "@/lib/providers";
import { getStreamTypeMeta, type Source } from "@/lib/sources";

interface SourceSelectorGridProps {
  sources: Source[];
  activeSource: Source | null;
  recommendedSourceId?: string;
  onSelectSource: (source: Source) => void;
  lang: string;
  version?: string;
}

export default function SourceSelectorGrid({
  sources,
  activeSource,
  recommendedSourceId,
  onSelectSource,
  lang,
  version,
}: SourceSelectorGridProps) {
  const p = activeSource;

  return (
    <div className="mt-5 p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-zinc-900/60 border border-white/10 shadow-lg">
      {/* Cabecera del servidor activo */}
      <div className="flex items-center justify-between gap-3 mb-3.5 flex-wrap pb-3.5 border-b border-white/10">
        <div>
          <p className="text-xs text-zinc-400 font-medium">
            {lang === "pt" ? "Servidor ativo:" : "Servidor activo:"}
          </p>
          <p className="text-base sm:text-lg font-black text-white flex items-center gap-2 mt-0.5">
            <span className="text-[#008CFF]">{p?.providerName || "…"}</span>
            {p?.id === recommendedSourceId && (
              <span className="text-[10px] bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 rounded-full text-emerald-300 font-bold inline-flex items-center gap-1">
                ⭐ {lang === "pt" ? "Recomendado" : "Recomendado"}
              </span>
            )}
            {p?.isBeta && (
              <span className="text-[10px] bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 rounded-full text-amber-300 font-bold inline-flex items-center gap-1">
                🧪 Beta
              </span>
            )}
            {p && (
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                  getStreamTypeMeta(p.type).color
                }`}
              >
                {getStreamTypeMeta(p.type).badge}
              </span>
            )}
          </p>
        </div>

        {p && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs bg-white/5 border border-white/10 px-2.5 py-1 rounded-xl text-zinc-200 inline-flex items-center gap-1.5">
              <span>🔊 Audio:</span>
              <b className="text-white">
                {(p.languages || [p.lang])
                  .map((a) => `${getProviderLangMeta(a).flag} ${getProviderLangMeta(a).name}`)
                  .join(", ")}
              </b>
            </span>
            {p.subtitles && p.subtitles.length > 0 && (
              <span className="text-xs bg-sky-500/10 border border-sky-500/25 px-2.5 py-1 rounded-xl text-sky-300 inline-flex items-center gap-1.5">
                <span>💬 Subs:</span>
                <b className="text-sky-200">
                  {p.subtitles.map((sub) => sub.id.toUpperCase()).join(", ")}
                </b>
              </span>
            )}
          </div>
        )}
      </div>

      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
        {lang === "pt" ? "Outros servidores e idiomas disponíveis:" : "Otros servidores e idiomas disponibles:"}
      </p>

      {/* Cuadrícula interactiva de Servidores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
        {sources.map((x) => {
          const isSelected = p?.id === x.id;
          const isRec = x.id === recommendedSourceId;
          const audios = x.languages && x.languages.length ? x.languages : [x.lang];
          const subs = x.subtitles || [];
          const primaryMeta = getProviderLangMeta(audios[0] || x.lang);
          const typeMeta = getStreamTypeMeta(x.type);

          return (
            <button
              key={x.id}
              onClick={() => onSelectSource(x)}
              className={`text-left p-3 rounded-2xl border transition-all duration-200 active:scale-[0.98] flex flex-col justify-between gap-2.5 touch-manipulation ${
                isSelected
                  ? "bg-[#008CFF]/15 border-[#008CFF] shadow-[0_0_20px_rgba(0,140,255,0.3)] ring-1 ring-[#008CFF]"
                  : x.isBeta
                  ? "bg-amber-500/5 border-amber-500/20 hover:border-amber-500/50 hover:bg-amber-500/10 text-zinc-200"
                  : "bg-white/5 border-white/10 hover:border-white/25 hover:bg-white/10 text-zinc-200"
              }`}
            >
              <div className="flex items-center justify-between gap-1 w-full">
                <span className={`text-sm font-bold truncate ${isSelected ? "text-white" : "text-zinc-100"}`}>
                  {x.providerName}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${typeMeta.color}`}
                  >
                    {typeMeta.badge}
                  </span>
                  {isSelected ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-[#008CFF] animate-pulse shrink-0" />
                  ) : isRec ? (
                    <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded-md shrink-0">
                      ⭐
                    </span>
                  ) : x.isBeta ? (
                    <span className="text-[9px] font-extrabold text-amber-400 bg-amber-500/20 px-1 py-0.5 rounded-md shrink-0">
                      BETA
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                <span
                  className={`px-2 py-0.5 rounded-lg font-semibold inline-flex items-center gap-1 ${
                    isSelected ? "bg-white/20 text-white" : primaryMeta.color
                  }`}
                >
                  <span>🔊</span>
                  <span>{audios.map((a) => getProviderLangMeta(a).badge).join("/")}</span>
                </span>
                {subs.length > 0 && (
                  <span
                    className={`px-2 py-0.5 rounded-lg font-medium inline-flex items-center gap-1 ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : "bg-sky-500/15 border border-sky-500/30 text-sky-300"
                    }`}
                  >
                    <span>💬</span>
                    <span>{subs.map((sub) => sub.id.toUpperCase()).join("/")}</span>
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between gap-2 flex-wrap text-xs text-zinc-400">
        <p className="flex items-center gap-1.5">
          <span>💡</span>
          <span>
            {lang === "pt"
              ? "Se o vídeo travar ou estiver sem som, selecione qualquer um dos outros servidores acima."
              : "Si el video se detiene o no tiene audio, selecciona cualquiera de los otros servidores arriba."}
          </span>
        </p>
        {version && <span className="text-zinc-500 text-[11px]">v{version}</span>}
      </div>
    </div>
  );
}
