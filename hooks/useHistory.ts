"use client";
import { useEffect, useState } from "react";
import type { ProviderId } from "@/lib/providers";
import type { Lang } from "@/lib/dict";
import { t } from "@/lib/dict";

export type Entry = {
  type: "movie" | "tv";
  id: string;
  title: string;
  poster: string;
  season?: number;
  episode?: number;
  updatedAt: number;
};

const H = "tvshow_history_v1";
const P = "tvshow_provider_v1";

export function useHistory() {
  const [history, setHistory] = useState<Entry[]>([]);
  const [provider, setProviderState] = useState<ProviderId>("vidcore");
  useEffect(() => {
    try {
      setHistory(JSON.parse(localStorage.getItem(H) || "[]"));
      const p = localStorage.getItem(P) as ProviderId | null;
      if (p) setProviderState(p);
    } catch {}
  }, []);
  const save = (e: Omit<Entry, "updatedAt">) => {
    setHistory((h) => {
      const k = (x: Entry) => `${x.type}-${x.id}-${x.season || 0}-${x.episode || 0}`;
      const next = [{ ...e, updatedAt: Date.now() }, ...h.filter((x) => k(x) !== k(e as Entry))].slice(0, 30);
      localStorage.setItem(H, JSON.stringify(next));
      return next;
    });
  };
  const setProvider = (p: ProviderId) => {
    setProviderState(p);
    localStorage.setItem(P, p);
  };
  const keyOf = (x: Pick<Entry, "type" | "id" | "season" | "episode">) => `${x.type}-${x.id}-${x.season || 0}-${x.episode || 0}`;
  const remove = (e: Pick<Entry, "type" | "id" | "season" | "episode">) => {
    setHistory((h) => {
      const next = h.filter((x) => keyOf(x) !== keyOf(e));
      localStorage.setItem(H, JSON.stringify(next));
      return next;
    });
  };
  const clear = () => {
    localStorage.setItem(H, "[]");
    setHistory([]);
  };
  return { history, save, remove, clear, provider, setProvider };
}

export const timeAgo = (ts: number, lang: Lang = "es") => {
  const d = t(lang);
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return d.now;
  if (m < 60) return `${d.ago_m} ${m} ${d.min}`.trim();
  const h = Math.floor(m / 60);
  if (h < 24) return `${d.ago_h} ${h} ${d.h}`.trim();
  return `${d.ago_d} ${Math.floor(h / 24)} ${d.d}`.trim();
};
