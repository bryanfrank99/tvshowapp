// Identificador persistente y único de dispositivo (Web, Android TV, Móvil, Windows)
const STORAGE_KEY = "tvshow_device_id";
const COOKIE_NAME = "tvdev";

function generateRandomId(): string {
  let hex = "";
  if (typeof window !== "undefined" && window.crypto && window.crypto.getRandomValues) {
    const bytes = new Uint8Array(6);
    window.crypto.getRandomValues(bytes);
    hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  } else {
    for (let i = 0; i < 12; i++) {
      hex += Math.floor(Math.random() * 16).toString(16).toUpperCase();
    }
  }
  return `DEV-${hex}`;
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2].trim()) : null;
}

function setCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  // 10 años de persistencia
  const maxAge = 60 * 60 * 24 * 365 * 10;
  const isSecure = typeof location !== "undefined" && location.protocol === "https:";
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax${isSecure ? "; Secure" : ""}`;
}

export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "DEV-SERVER";

  try {
    // 1. Intentar desde localStorage
    let id = localStorage.getItem(STORAGE_KEY);
    if (id && /^DEV-[A-F0-9]{12}$/i.test(id.trim())) {
      const cleanId = id.trim().toUpperCase();
      setCookie(COOKIE_NAME, cleanId);
      return cleanId;
    }

    // 2. Intentar desde cookie persistente (recuperación si limpiaron localStorage)
    const cookieId = getCookie(COOKIE_NAME);
    if (cookieId && /^DEV-[A-F0-9]{12}$/i.test(cookieId.trim())) {
      const cleanId = cookieId.trim().toUpperCase();
      try { localStorage.setItem(STORAGE_KEY, cleanId); } catch {}
      return cleanId;
    }

    // 3. Generar nuevo ID
    const newId = generateRandomId();
    try { localStorage.setItem(STORAGE_KEY, newId); } catch {}
    setCookie(COOKIE_NAME, newId);
    return newId;
  } catch {
    return generateRandomId();
  }
}
