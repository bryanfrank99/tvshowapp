"use client";
import { useEffect, useState } from "react";

export type Fav = { type: "movie" | "tv"; id: string; title: string; poster: string; addedAt: number };
const KEY = "tvshow_favs_v1";

export function useFavorites() {
  const [favs, setFavs] = useState<Fav[]>([]);
  useEffect(() => {
    try { setFavs(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch {}
  }, []);
  const persist = (next: Fav[]) => {
    localStorage.setItem(KEY, JSON.stringify(next));
    setFavs(next);
  };
  const has = (type: string, id: string | number) => favs.some((f) => f.type === type && String(f.id) === String(id));
  const toggle = (f: Omit<Fav, "addedAt">) => {
    const k = (x: Fav) => `${x.type}-${x.id}`;
    if (favs.some((x) => k(x) === k(f as Fav))) persist(favs.filter((x) => k(x) !== k(f as Fav)));
    else persist([{ ...f, id: String(f.id), addedAt: Date.now() }, ...favs].slice(0, 100));
  };
  const remove = (type: string, id: string | number) =>
    persist(favs.filter((f) => !(f.type === type && String(f.id) === String(id))));
  return { favs, has, toggle, remove };
}
