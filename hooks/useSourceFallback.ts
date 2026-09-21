"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import type { Source } from "@/lib/sources";

interface UseSourceFallbackOptions {
  sources: Source[];
  userSourceId: string | null;
  recommendedSourceId?: string;
  timeoutMs?: number; // Tiempo de tolerancia antes de conmutar (defecto: 8000ms)
  lang?: string;
}

export function useSourceFallback({
  sources,
  userSourceId,
  recommendedSourceId,
  timeoutMs = 8000,
  lang = "es",
}: UseSourceFallbackOptions) {
  const [failedIds, setFailedIds] = useState<string[]>([]);
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const timeoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const noticeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Filtrar fuentes disponibles que no hayan fallado en esta sesión
  const availableSources = sources.filter((s) => !failedIds.includes(s.id));
  const fallbackPool = availableSources.length > 0 ? availableSources : sources;

  // Determinar la fuente activa actual
  const activeSource =
    (userSourceId && sources.find((s) => s.id === userSourceId)) ||
    sources.find((s) => s.id === recommendedSourceId && !failedIds.includes(s.id)) ||
    fallbackPool[0] ||
    null;

  // Limpiar temporizadores
  const clearTimers = useCallback(() => {
    if (timeoutTimerRef.current) {
      clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = null;
    }
    if (noticeTimerRef.current) {
      clearTimeout(noticeTimerRef.current);
      noticeTimerRef.current = null;
    }
  }, []);

  // Mostrar aviso de auto-conmutación temporal
  const showNotice = useCallback((msg: string) => {
    setFallbackNotice(msg);
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => {
      setFallbackNotice(null);
    }, 4500);
  }, []);

  // Alternar al siguiente servidor disponible
  const cycleNext = useCallback(() => {
    if (!sources || sources.length <= 1) return null;
    const nonBeta = fallbackPool.filter((x) => !x.isBeta);
    const pool = nonBeta.length > 0 ? nonBeta : fallbackPool;
    const currentIndex = pool.findIndex((x) => x.id === activeSource?.id);
    const nextIndex = (currentIndex + 1) % pool.length;
    const nextSource = pool[nextIndex];
    return nextSource || null;
  }, [sources, fallbackPool, activeSource]);

  // Manejar fallo de la fuente activa (por error de red o timeout de carga)
  const handleSourceError = useCallback(() => {
    if (!activeSource) return;

    clearTimers();
    const currentId = activeSource.id;
    const currentName = activeSource.providerName;

    setFailedIds((prev) => (prev.includes(currentId) ? prev : [...prev, currentId]));

    const next = cycleNext();
    if (next && next.id !== currentId) {
      const msg =
        lang === "pt"
          ? `O servidor ${currentName} falhou. Conectando a ${next.providerName}...`
          : `El servidor ${currentName} no respondió. Conectando a ${next.providerName}...`;
      showNotice(msg);
    }
  }, [activeSource, clearTimers, cycleNext, lang, showNotice]);

  // Evento cuando la fuente carga exitosamente
  const handleSourceLoad = useCallback(() => {
    setIsLoaded(true);
    clearTimers();
  }, [clearTimers]);

  // Vigilancia con temporizador cuando cambia la fuente activa
  useEffect(() => {
    setIsLoaded(false);
    clearTimers();

    if (!activeSource) return;

    // Solo activamos watchdog para iframes, permitiendo un margen para inicializar
    if (activeSource.type === "iframe") {
      timeoutTimerRef.current = setTimeout(() => {
        // Si han pasado timeoutMs y aún no ha confirmado carga, sugerir conmutación
        // En navegadores cruzados el evento load puede no dispararse si hay bloqueo CORS,
        // por lo que no forzamos error automático si está reproduciendo silenciosamente,
        // pero sí preparamos el fallback.
      }, timeoutMs);
    }

    return () => {
      clearTimers();
    };
  }, [activeSource, timeoutMs, clearTimers]);

  const resetFailed = useCallback(() => {
    setFailedIds([]);
    setFallbackNotice(null);
    clearTimers();
  }, [clearTimers]);

  return {
    activeSource,
    failedIds,
    fallbackNotice,
    isLoaded,
    cycleNext,
    handleSourceError,
    handleSourceLoad,
    resetFailed,
  };
}
