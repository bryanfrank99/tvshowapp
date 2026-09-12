"use client";
import { useEffect, useState } from "react";
import type { Lang } from "@/lib/dict";

const COOKIE = "tvshow_lang";
export const LANGS: Lang[] = ["pt", "es", "en"];

export function getClientLang(): Lang {
  if (typeof document === "undefined") return "pt";
  const m = document.cookie.match(/(?:^|; )tvshow_lang=(pt|es|en)/);
  return (m?.[1] as Lang) || "pt";
}

export function setClientLang(l: Lang) {
  document.cookie = `${COOKIE}=${l}; path=/; max-age=31536000`;
  window.location.reload();
}

export function useLang() {
  const [lang, setLang] = useState<Lang>("pt");
  useEffect(() => setLang(getClientLang()), []);
  return { lang, setLang: setClientLang };
}
