"use client";
import { useEffect, useState } from "react";
import type { Lang } from "@/lib/dict";

const COOKIE = "tvshow_lang";
export const LANGS: Lang[] = ["pt", "es", "en"];

export function getClientLang(): Lang {
  if (typeof document === "undefined") return "pt";
  const m = document.cookie.match(/(?:^|; )tvshow_lang=(pt|es|en)/);
  if (m?.[1]) return m[1] as Lang;
  try {
    const ls = localStorage.getItem(COOKIE) as Lang | null;
    if (ls === "pt" || ls === "es" || ls === "en") return ls;
  } catch {}
  return "pt";
}

export async function setClientLang(l: Lang) {
  try {
    document.cookie = `${COOKIE}=${l}; path=/; max-age=31536000; SameSite=Lax`;
    localStorage.setItem(COOKIE, l);
  } catch {}
  try {
    await fetch("/api/lang", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lang: l }),
    });
  } catch {}
  window.location.reload();
}

export function useLang() {
  const [lang, setLang] = useState<Lang>("pt");
  useEffect(() => {
    const current = getClientLang();
    setLang(current);
    try {
      if (!document.cookie.includes("tvshow_lang=")) {
        document.cookie = `${COOKIE}=${current}; path=/; max-age=31536000; SameSite=Lax`;
      }
    } catch {}
  }, []);
  return { lang, setLang: setClientLang };
}
