"use client";
import { useEffect, useState } from "react";
import { useHistory, timeAgo } from "@/hooks/useHistory";
import { IconClock, IconX } from "@/components/Icons";
import { MediaCard } from "@/components/Cards";
import { useLang } from "@/hooks/useLang";
import { t } from "@/lib/dict";

export default function ContinueWatching() {
  const { history, remove, clear } = useHistory();
  const { lang } = useLang();
  const d = t(lang);
  // localStorage solo existe en el cliente: esperar al montaje para que el
  // primer render coincida con el servidor y no haya hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || !history.length) return null;
  return (
    <section className="mb-8">
      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-xl font-extrabold inline-flex items-center gap-2"><IconClock className="text-[#008CFF]" />{d.seguir}</h2>
        <button
          onClick={() => { if (confirm(d.limpiar_confirm)) clear(); }}
          className="text-xs text-zinc-500 hover:text-red-400 border border-white/10 hover:border-red-400/50 rounded-full px-2.5 py-0.5"
        >
          {d.limpiar}
        </button>
      </div>
      <div className="rail">
        {history.map((x) => (
          <MediaCard
            key={`${x.type}-${x.id}-${x.season}-${x.episode}`}
            item={{
              id: x.id,
              title: x.title,
              poster_path: x.poster,
              vote_average: x.rating,
              media_type: x.type,
            }}
            href={`/watch?type=${x.type}&id=${x.id}${x.type === "tv" ? `&s=${x.season}&e=${x.episode}` : ""}`}
            subtitle={x.type === "tv" ? `${d.tv_t}${x.season}${d.ep_e}${x.episode}` : d.pelicula}
            extraMeta={`${d.visto} ${timeAgo(x.updatedAt, lang)}`}
            actionButton={
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  remove(x);
                }}
                title={`Quitar ${x.title}`}
                aria-label={`Quitar ${x.title} de Seguir viendo`}
                className="w-8 h-8 rounded-full bg-black/65 backdrop-blur-md border border-white/20 hover:bg-red-600 hover:border-red-600 active:scale-90 transition-all flex items-center justify-center text-white shadow-md cursor-pointer"
              >
                <IconX size={12} />
              </button>
            }
          />
        ))}
      </div>
    </section>
  );
}

