"use client";
import { useEffect, useState } from "react";

// Modo TV: UA marcada por la app nativa (TVShowTV), TVs genéricas o ?tv=1.
// En TV se oculta la barra móvil y se prioriza sidebar + mando.
export function isTVUA(): boolean {
  if (typeof navigator === "undefined") return false;
  try {
    if (new URLSearchParams(window.location.search).get("tv") === "1") return true;
    if (localStorage.getItem("tvshow_tv") === "1") return true;
  } catch {}
  return /TVShowTV|Android TV|Smart[ -]?TV|GoogleTV| TV;|Leanback/i.test(navigator.userAgent);
}

export function useIsTV() {
  const [tv, setTv] = useState(false);
  useEffect(() => setTv(isTVUA()), []);
  return tv;
}
