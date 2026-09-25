"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { fetchLiveSources, type LiveSource } from "@/lib/providers";
import { RailSkeleton } from "@/components/Skeleton";
import { IconSignal, IconBall } from "@/components/Icons";
import { useLang } from "@/hooks/useLang";
import { t } from "@/lib/dict";

type Item = { key: string; name: string; sub: string; image: string; url: string; live: boolean };

const slug = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");

const normLogo = (s: string) => norm(s).replace(/ /g, "");
const normGuide = (s: string) => norm(s).replace(/ /g, "");
const fmtT = (t: number) => new Date(t).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

async function loadSource(src: LiveSource): Promise<Item[]> {
  const r = await fetch(`/api/live/list?url=${encodeURIComponent(src.list)}`, { cache: "no-store" });
  if (!r.ok) throw new Error();
  const j = await r.json();
  if (src.format === "streambetter") {
    return (j.channels || []).map((c: any) => ({
      key: slug(c.name), name: c.name, sub: "", image: c.image || "",
      url: c.url?.startsWith("http") ? c.url : `https://streambetter.shop/canal/${slug(c.name)}`,
      live: true,
    }));
  }
  // tvf90: { CATEGORIA: [{ Canal, Estado, Link }] }
  const out: Item[] = [];
  for (const cat of Object.keys(j)) {
    if (cat === "error") continue;
    for (const c of j[cat] || []) {
      if (!c?.Link) continue;
      out.push({ key: `${cat}-${c.Canal}`, name: c.Canal, sub: cat, image: "", url: c.Link, live: c.Estado === "Activo" });
    }
  }
  return out;
}

export default function LivePage() {
  const [sources, setSources] = useState<{ src: LiveSource; items: Item[] }[]>([]);
  const { lang } = useLang();
  const d = t(lang);
  const [q, setQ] = useState("");
  const [current, setCurrent] = useState<{ name: string; url: string } | null>(null);
  const [nowMap, setNowMap] = useState<Record<string, string>>({});
  const [guideMap, setGuideMap] = useState<Record<string, { now: { t: string; s: number; e: number; img?: string } | null }>>({});
  const [err, setErr] = useState(false);

  useEffect(() => {
    fetchLiveSources().then(async (list) => {
      const res = await Promise.all(
        list.map(async (src) => {
          try { return { src, items: await loadSource(src) }; }
          catch { return { src, items: [] as Item[] }; }
        })
      );
      // TVF90 no trae logos: 1) StreamBetter por nombre, 2) DB abierta iptv-org.
      const logos = new Map<string, string>();
      res.find((r) => r.src.format === "streambetter")?.items.forEach((it) => {
        if (it.image && !logos.has(norm(it.name))) logos.set(norm(it.name), it.image);
      });
      try {
        const lr = await fetch("/api/live/logos", { cache: "no-store" });
        const lj = await lr.json();
        for (const [k, v] of Object.entries<string>(lj.logos || {})) {
          if (!logos.has(k)) logos.set(k, v);
        }
      } catch {}
      const byLogo = (name: string) => logos.get(norm(name)) || logos.get(normLogo(name)) || "";
      res.forEach((r) => {
        r.items = r.items.map((it) => it.image ? it : { ...it, image: byLogo(it.name) });
      });
      if (res.every((r) => !r.items.length)) setErr(true);
      setSources(res);
    });
    // EPG StreamBetter: qué se transmite ahora por canal (texto plano en la tarjeta).
    fetch(`/api/live/list?url=${encodeURIComponent("https://streambetter.shop/api/epg?channel=all")}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        const m: Record<string, string> = {};
        for (const slug of Object.keys(j.channels || {})) {
          const live = (j.channels[slug] || []).find((p: any) => p.isLive) || (j.channels[slug] || [])[0];
          if (live?.title) m[slug] = live.title;
        }
        setNowMap(m);
      })
      .catch(() => {});
    // Guía XMLTV LatAm (iptv-epg.org): ahora para los canales deportivos.
    fetch("/api/live/guide", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setGuideMap(j.guide || {}))
      .catch(() => {});
  }, []);

  const play = (name: string, url: string) => {
    setCurrent({ name, url });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Control con mando a distancia para cerrar el reproductor en vivo con el botón Atrás
  useEffect(() => {
    if (!current) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.keyCode;
      if (e.key === "GoBack" || k === 4 || k === 27 || e.key === "Escape") {
        e.preventDefault();
        setCurrent(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [current]);

  const filt = (items: Item[]) =>
    items.filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase()) || c.sub.toLowerCase().includes(q.toLowerCase()));

  // Lista plana de todos los canales filtrados para soporte de zapping rápido
  const allFilteredItems = sources.flatMap((s) => filt(s.items));
  const currentIdx = current ? allFilteredItems.findIndex((it) => current.name.startsWith(it.name)) : -1;

  const zapNext = () => {
    if (allFilteredItems.length === 0) return;
    const nextIdx = (currentIdx + 1) % allFilteredItems.length;
    const it = allFilteredItems[nextIdx];
    play(it.sub ? `${it.name} · ${it.sub}` : it.name, it.url);
  };

  const zapPrev = () => {
    if (allFilteredItems.length === 0) return;
    const prevIdx = (currentIdx - 1 + allFilteredItems.length) % allFilteredItems.length;
    const it = allFilteredItems[prevIdx];
    play(it.sub ? `${it.name} · ${it.sub}` : it.name, it.url);
  };

  return (
    <>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <h1 className="text-2xl font-black inline-flex items-center gap-2"><IconSignal className="text-red-400" />{d.live_title}</h1>
        <form className="flex gap-2 ml-auto" onSubmit={(e) => e.preventDefault()}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={d.buscar_canal}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-sm outline-none focus:border-[#008CFF] focus:ring-2 focus:ring-[#008CFF]" />
        </form>
      </div>
      {current && (
        <div id="tv-live-player-box" className="mb-6">
          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
            <p className="text-sm font-semibold flex items-center gap-2">
              <span className="text-red-400 font-bold inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block" />
                <span>● {d.en_vivo}</span>
              </span>
              <span className="text-zinc-500">·</span>
              <span className="text-white">{current.name}</span>
            </p>
            {/* Barra de control TV para el reproductor en vivo */}
            <div className="flex items-center gap-2">
              <button
                id="btn-live-prev"
                onClick={zapPrev}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-[#008CFF] text-xs font-semibold text-zinc-200 hover:text-white transition focus:ring-2 focus:ring-[#008CFF] outline-none"
                title="Canal anterior"
              >
                ◀ Anterior
              </button>
              <button
                id="btn-live-next"
                onClick={zapNext}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-[#008CFF] text-xs font-semibold text-zinc-200 hover:text-white transition focus:ring-2 focus:ring-[#008CFF] outline-none"
                title="Canal siguiente"
              >
                Siguiente ▶
              </button>
              <button
                id="btn-live-close"
                onClick={() => setCurrent(null)}
                className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500 border border-red-500/40 text-xs font-bold text-red-200 hover:text-white transition focus:ring-2 focus:ring-red-400 outline-none"
                title="Cerrar reproducción"
              >
                ✕ Cerrar (Atrás)
              </button>
            </div>
          </div>
          <div className="rounded-2xl overflow-hidden border border-white/15 bg-black shadow-2xl">
            <iframe key={current.url} src={current.url} className="w-full aspect-video bg-black block"
              allowFullScreen allow="autoplay; encrypted-media; fullscreen; picture-in-picture" referrerPolicy="origin" />
          </div>
        </div>
      )}
      {err && <p className="text-sm text-red-300 mb-4">{d.guia_error}</p>}
      {!sources.length && !err && <RailSkeleton n={6} />}
      {sources.map(({ src, items }) => {
        const list = filt(items);
        if (!list.length) return null;
        return (
          <section key={src.id} className="mb-8">
            <h2 className="text-xl font-extrabold mb-3 inline-flex items-center gap-2">{src.id === "tvf90" ? <IconBall className="text-emerald-400" /> : <IconSignal className="text-red-400" />}{src.id === "tvf90" ? d.agenda : src.format === "streambetter" ? d.canales : src.name}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {list.map((c) => {
                const g = guideMap[normGuide(c.name)];
                return (
                <button
                  key={c.key}
                  id={`live-chan-${c.key}`}
                  onClick={() => play(c.sub ? `${c.name} · ${c.sub}` : c.name, c.url)}
                  className={`bg-white/5 border rounded-xl p-4 flex flex-col items-center gap-2 hover:border-[#008CFF] focus:border-[#008CFF] focus:ring-2 focus:ring-[#008CFF] focus:bg-white/10 outline-none transition ${current?.name.startsWith(c.name) ? "border-[#008CFF] bg-[#008CFF]/15" : "border-white/10"}`}>
                  {c.image
                    ? <Image src={c.image} alt={c.name} width={120} height={60} className="h-12 object-contain" loading="lazy" unoptimized />
                    : <span className="h-12 flex items-center font-black text-base text-center leading-tight">{c.name}</span>}
                  <span className="text-xs font-semibold truncate w-full text-center">{c.name}</span>
                  {c.sub && <span className="text-xs text-zinc-500 truncate w-full text-center">{c.sub}</span>}
                  <span className={`text-[10px] font-bold ${c.live ? "text-red-400" : "text-zinc-500"}`}>
                    {c.live ? `● ${d.en_vivo}` : "○"}
                  </span>
                  {(() => {
                    const txt = (src.id === "streambetter" && nowMap[c.key])
                      ? nowMap[c.key]
                      : (g?.now ? g.now.t : "");
                    return txt ? <span className="text-xs text-zinc-300 truncate w-full text-center">{txt}</span> : null;
                  })()}
                </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </>
  );
}

