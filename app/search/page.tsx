"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLang } from "@/hooks/useLang";
import { t } from "@/lib/dict";
import { MediaCard } from "@/components/Cards";
import { GridSkeleton } from "@/components/Skeleton";

type Item = {
  id: number | string; media_type?: string; title?: string; name?: string;
  poster_path?: string | null; vote_average?: number;
};

const ROWS: string[][] = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["A", "Á", "B", "C", "D", "E", "É"],
  ["F", "G", "H", "I", "Í", "J", "K"],
  ["L", "M", "N", "Ñ", "O", "Ó", "P"],
  ["Q", "R", "S", "T", "U", "Ú", "Ü"],
  ["V", "W", "X", "Y", "Z", " "],
];

function SearchInner() {
  const sp = useSearchParams();
  const { lang } = useLang();
  const d = t(lang);
  const [q, setQ] = useState(sp.get("q") || "");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState("");

  const run = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/search${query ? `?q=${encodeURIComponent(query)}` : ""}`, { cache: "no-store" });
      const j = await r.json();
      setItems(j.results || []);
      setSearched(query);
    } catch {
      setItems([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { run(sp.get("q") || ""); }, [run, sp]);

  return (
    <div className="grid lg:grid-cols-[300px_1fr] gap-6">
      {/* Panel teclado */}
      <div>
        <input value={q} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") run(q.trim()); }}
          placeholder={d.search_ph}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 h-11 text-sm outline-none focus:border-[#008CFF] mb-3" />
        <div data-rail className="flex flex-col gap-1.5">
          <div className="flex gap-1.5">
            <button onClick={() => setQ("")} className="flex-1 h-10 rounded-lg bg-white/5 border border-white/10 text-sm hover:border-red-400" title={d.limpiar}>✕</button>
            <button onClick={() => setQ((v) => v.slice(0, -1))} className="flex-1 h-10 rounded-lg bg-white/5 border border-white/10 text-sm hover:border-[#008CFF]" title="Borrar">⌫</button>
            <button onClick={() => run(q.trim())} className="flex-[2] h-10 rounded-lg bg-[#008CFF] font-bold text-sm">{d.search_btn}</button>
          </div>
          {ROWS.map((row, k) => (
            <div key={k} className="flex gap-1.5">
              {row.map((ch) => (
                <button key={ch} onClick={() => setQ((v) => v + ch.toLowerCase())}
                  className="flex-1 h-10 rounded-lg bg-white/5 border border-white/10 hover:border-[#008CFF] hover:bg-white/10 text-sm font-semibold min-w-0">
                  {ch === " " ? "␣" : ch}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
      {/* Resultados */}
      <div>
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <h1 className="text-xl font-black">{searched ? `${d.resultados}: ${searched}` : d.popular}</h1>
          <button onClick={() => { setQ(""); run(""); }}
            className="px-4 h-9 rounded-full bg-white/5 border border-white/10 text-sm hover:border-[#008CFF]">{d.refresh}</button>
          <span className="ml-auto text-sm">{d.total}: <b className="text-[#f5c518]">{loading ? "…" : items.length}</b></span>
        </div>
        {loading
          ? <GridSkeleton n={10} />
          : <div data-rail className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
              {items.map((it) => {
                const tp = (it.media_type || (it as any).first_air_date) ? "tv" : "movie";
                return <MediaCard key={`${tp}-${it.id}`} item={{ ...it, media_type: tp }} />;
              })}
            </div>}
        {!loading && !items.length && <p className="text-sm text-zinc-500">{d.search_no_results}</p>}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return <Suspense><SearchInner /></Suspense>;
}
