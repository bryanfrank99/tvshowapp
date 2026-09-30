// lib/playback-progress.ts
// Gestión y persistencia del progreso de reproducción en Base de Datos Local (localStorage)
// Permite guardar la posición exacta en segundos y reanudarla automáticamente.

export interface PlaybackProgress {
  currentTime: number;
  duration: number;
  progressPct: number;
  updatedAt: number;
}

const STORAGE_PREFIX = "tvshow_playback_pos_v1_";

export function getPlaybackKey(
  type: "movie" | "tv" | string,
  id: string,
  season?: number,
  episode?: number
): string {
  const cleanId = String(id || "").trim();
  if (type === "tv") {
    return `${STORAGE_PREFIX}tv_${cleanId}_s${season || 1}_e${episode || 1}`;
  }
  return `${STORAGE_PREFIX}movie_${cleanId}`;
}

export function savePlaybackProgress(
  key: string,
  currentTime: number,
  duration: number
): void {
  if (typeof window === "undefined" || !key || isNaN(currentTime) || currentTime < 0) return;

  try {
    const validDuration = !isNaN(duration) && duration > 0 ? duration : 0;
    const progressPct = validDuration > 0 ? (currentTime / validDuration) * 100 : 0;

    // Si el usuario ya vio el 92% o más (créditos finales), reiniciamos para que la próxima vez empiece desde 0
    if (progressPct >= 92) {
      clearPlaybackProgress(key);
      return;
    }

    // No guardar si apenas lleva menos de 5 segundos
    if (currentTime < 5) return;

    const payload: PlaybackProgress = {
      currentTime: Math.floor(currentTime * 10) / 10,
      duration: Math.floor(validDuration * 10) / 10,
      progressPct: Math.round(progressPct * 10) / 10,
      updatedAt: Date.now(),
    };

    localStorage.setItem(key, JSON.stringify(payload));
  } catch {}
}

export function getPlaybackProgress(key: string): PlaybackProgress | null {
  if (typeof window === "undefined" || !key) return null;

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.currentTime === "number") {
      return parsed as PlaybackProgress;
    }
  } catch {}
  return null;
}

export function clearPlaybackProgress(key: string): void {
  if (typeof window === "undefined" || !key) return null as any;
  try {
    localStorage.removeItem(key);
  } catch {}
}
