"use client";
import { useEffect, useState } from "react";
import { isTVUA } from "@/hooks/useIsTV";

export function isMobileUA(): boolean {
  if (typeof navigator === "undefined") return false;
  if (isTVUA()) return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "mobile") return true;
    if (params.get("mode") === "tv" || params.get("tv") === "1") return false;
  } catch {}
  return /TVShowMobile|iPhone|iPad|iPod|Android.*Mobile|Mobile/i.test(navigator.userAgent);
}

export function useDeviceMode() {
  const [mode, setMode] = useState<{ isTV: boolean; isMobile: boolean; isDesktop: boolean }>({
    isTV: false,
    isMobile: false,
    isDesktop: true,
  });

  useEffect(() => {
    const check = () => {
      const tv = isTVUA();
      const mobile = !tv && (window.innerWidth < 768 || isMobileUA());
      setMode({
        isTV: tv,
        isMobile: mobile,
        isDesktop: !tv && !mobile,
      });
    };

    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return mode;
}
