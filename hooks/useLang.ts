"use client";
import { useEffect, useState } from "react";
import type { Lang } from "@/lib/dict";

const COOKIE = "tvshow_lang";
export const LANGS: Lang[] = ["es", "en", "pt"];

export function getClientLang(): Lang {
  if (typeof document === "undefined") return "es";
  const m = document.cookie.match(/(?:^|; )tvshow_lang=(es|en|pt)/);
  return (m?.[1] as Lang) || "es";
}

export function setClientLang(l: Lang) {
  document.cookie = `${COOKIE}=${l}; path=/; max-age=31536000`;
  window.location.reload();
}

export function useLang() {
  const [lang, setLang] = useState<Lang>("es");
  useEffect(() => setLang(getClientLang()), []);
  return { lang, setLang: setClientLang };
}
