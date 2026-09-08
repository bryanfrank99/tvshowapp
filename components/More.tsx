"use client";
import { useState } from "react";
import { MediaCard } from "@/components/Cards";
import { episodeSpotCard } from "@/components/SpotCard";
import { useLang } from "@/hooks/useLang";
import { t } from "@/lib/dict";

type Params = Record<string, string>;

function useMore(source: string, params: Params, per: number) {
  const [items, setItems] = useState<any[]>([]);
  const [page, setPage] = useState(2);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [err, setErr] = useState(false);

  const more = async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    setErr(false);
    try {
      const qs = new URLSearchParams({ source, page: String(page), ...params });
      const r = await fetch(`/api/browse?${qs}`, { cache: "no-store" });
      const j = await r.json();
      const fresh = (j.items || []).filter(
        (x: any) => !items.some((y) => String(y.id) === String(x.id) && (y.seasonNum || 0) === (x.seasonNum || 0))
      );
      setItems((prev) => [...prev, ...fresh]);
      setHasMore(!!j.hasMore && fresh.length > 0);
      setPage((p) => p + 1);
    } catch {
      setErr(true);
    }
    setLoading(false);
  };

  return { items, more, loading, hasMore, err };
}

export function MoreButton({ onClick, loading, label, loadingLabel }: { onClick: () => void; loading: boolean; label: string; loadingLabel: string }) {
  return (
    <div className="flex justify-center mt-4">
      <button onClick={onClick} disabled={loading}
        className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/15 text-sm font-bold hover:border-[#008CFF] hover:text-white disabled:opacity-50">
        {loading ? loadingLabel : label}
      </button>
    </div>
  );
}

// Rail horizontal con "Cargar más" (home: spotlight, picks, upcoming).
export function MoreRail({ initial, source, params = {}, kind }: { initial: any[]; source: string; params?: Params; kind: "spot" | "media" }) {
  const { lang } = useLang();
  const d = t(lang);
  const { items, more, loading, hasMore } = useMore(source, params, initial.length || 12);
  const all = [...initial, ...items];
  return (
    <>
      <div className="rail">
        {all.map((x: any, k: number) =>
          kind === "spot"
            ? <span key={`${x.show?.id}-${x.seasonNum}-${k}`} style={{ display: "contents" }}>{episodeSpotCard({ show: x.show, seasonNum: x.seasonNum, ep: x.ep })}</span>
            : <MediaCard key={String(x.id)} item={x} />
        )}
      </div>
      {hasMore && <MoreButton onClick={more} loading={loading} label={d.cargar_mas} loadingLabel={d.cargando} />}
    </>
  );
}

// Grid con "Cargar más" (movies, series, search, genre).
export function MoreGrid({ initial, source, params = {} }: { initial: any[]; source: string; params?: Params }) {
  const { lang } = useLang();
  const d = t(lang);
  const { items, more, loading, hasMore } = useMore(source, params, initial.length || 24);
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {[...initial, ...items].map((x: any) => <MediaCard key={String(x.id)} item={x} />)}
      </div>
      {hasMore && <MoreButton onClick={more} loading={loading} label={d.cargar_mas} loadingLabel={d.cargando} />}
    </>
  );
}
