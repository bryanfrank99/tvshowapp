"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useHistory, timeAgo } from "@/hooks/useHistory";
import { IconClock, IconX, IconStar, IconPlay } from "@/components/Icons";
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
        {history.map((x) => {
          return (
            <div key={`${x.type}-${x.id}-${x.season}-${x.episode}`} className="group relative bg-white/5 border border-[#008CFF]/30 rounded-xl overflow-hidden hover:border-[#008CFF] hover:-translate-y-1 transition">
              <Link href={`/watch?type=${x.type}&id=${x.id}${x.type === "tv" ? `&s=${x.season}&e=${x.episode}` : ""}`} className="block">
                <Image src={x.poster || "https://via.placeholder.com/500x750?text=?"} alt={x.title} width={300} height={450} className="w-full aspect-[2/3] object-cover" />
                <span className="absolute inset-0 m-auto w-14 h-14 rounded-full hidden group-hover:flex items-center justify-center bg-gradient-to-br from-[#008CFF] to-[#008CFF]/70 shadow-[0_0_24px_rgba(0,140,255,0.7)] ring-1 ring-white/40 pointer-events-none">
                  <IconPlay size={22} className="ml-0.5 text-white" />
                </span>
                {(x.rating || 0) > 0 && (
                  <span className="absolute top-1.5 left-1.5 text-[11px] font-bold bg-black/70 rounded-md px-1.5 py-0.5 inline-flex items-center gap-1"><IconStar size={11} className="text-[#f5c518]" />{Math.round((x.rating || 0) * 10) / 10}</span>
                )}
                <div className="p-2">
                  <p className="text-sm font-semibold truncate">{x.title}</p>
                  <p className="text-xs text-zinc-400">{x.type === "tv" ? `${d.tv_t}${x.season}${d.ep_e}${x.episode}` : d.pelicula}</p>
                  <p className="text-[11px] text-zinc-500" title={new Date(x.updatedAt).toLocaleString()}>{d.visto} {timeAgo(x.updatedAt, lang)}</p>
                </div>
              </Link>
              <button
                onClick={() => remove(x)}
                title={`Quitar ${x.title}`}
                aria-label={`Quitar ${x.title} de Seguir viendo`}
                className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/70 border border-white/20 hover:bg-red-600 hover:border-red-600 flex items-center justify-center"
              >
                <IconX size={12} />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

