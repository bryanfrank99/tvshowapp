"use client";
import { useEffect, useState } from "react";

// Modo TV: UA marcada por la app nativa (TVShowTV), TVs genéricas o ?tv=1.
// Solo activo por UA/query, sin persistencia local para no contaminar web.
export function isTVUA(): boolean {
  if (typeof navigator === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "mobile") {
      try { localStorage.removeItem("tv_mode"); } catch {}
      return false;
    }
    if (params.get("tv") === "1" || params.get("mode") === "tv") {
      try { localStorage.setItem("tv_mode", "1"); } catch {}
      return true;
    }
    if (params.get("tv") === "0") {
      try { localStorage.removeItem("tv_mode"); } catch {}
      return false;
    }
    if (typeof localStorage !== "undefined" && localStorage.getItem("tv_mode") === "1") {
      return true;
    }
  } catch {}
  if (/TVShowMobile/i.test(navigator.userAgent)) return false;
  return /TVShowTV|Android TV|Smart[ -]?TV|GoogleTV| TV;|Leanback/i.test(navigator.userAgent);
}

export function useIsTV() {
  const [tv, setTv] = useState(false);
  useEffect(() => setTv(isTVUA()), []);
  return tv;
}
