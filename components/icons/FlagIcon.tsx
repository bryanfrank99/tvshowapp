import React from "react";

export interface FlagProps {
  className?: string;
  width?: number | string;
  height?: number | string;
}

/**
 * Bandera vectorial de Brasil (pt-BR)
 */
export function FlagBR({ className = "w-8 h-5.5 rounded overflow-hidden shadow-sm", width, height }: FlagProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 720 504"
      width={width}
      height={height}
      className={className}
      aria-label="Brasil"
    >
      <rect width="720" height="504" fill="#009b3a" />
      <polygon points="360,42 666,252 360,462 54,252" fill="#fedf00" />
      <circle cx="360" cy="252" r="126" fill="#002776" />
      <path
        d="M 234 252 A 130 130 0 0 1 486 252"
        stroke="#ffffff"
        strokeWidth="15"
        fill="none"
      />
    </svg>
  );
}

/**
 * Bandera vectorial de España (es-ES / es-419)
 */
export function FlagES({ className = "w-8 h-5.5 rounded overflow-hidden shadow-sm", width, height }: FlagProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 750 500"
      width={width}
      height={height}
      className={className}
      aria-label="España"
    >
      <rect width="750" height="500" fill="#c60b1e" />
      <rect width="750" height="250" y="125" fill="#ffc400" />
      {/* Escudo estilizado */}
      <g transform="translate(190, 200)">
        <rect x="-35" y="-45" width="70" height="90" rx="10" fill="#c60b1e" stroke="#ffc400" strokeWidth="4" />
        <rect x="-25" y="-35" width="50" height="70" rx="6" fill="#ffffff" opacity="0.9" />
        <circle cx="0" cy="0" r="14" fill="#c60b1e" />
        <circle cx="0" cy="0" r="8" fill="#ffc400" />
        {/* Corona superior */}
        <polygon points="-28,-50 28,-50 20,-62 0,-54 -20,-62" fill="#ffc400" />
      </g>
    </svg>
  );
}

/**
 * Bandera vectorial de Estados Unidos (en-US)
 */
export function FlagUS({ className = "w-8 h-5.5 rounded overflow-hidden shadow-sm", width, height }: FlagProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 741 390"
      width={width}
      height={height}
      className={className}
      aria-label="United States"
    >
      <rect width="741" height="390" fill="#b22234" />
      {/* 6 franjas blancas alternadas */}
      <rect width="741" height="30" y="30" fill="#ffffff" />
      <rect width="741" height="30" y="90" fill="#ffffff" />
      <rect width="741" height="30" y="150" fill="#ffffff" />
      <rect width="741" height="30" y="210" fill="#ffffff" />
      <rect width="741" height="30" y="270" fill="#ffffff" />
      <rect width="741" height="30" y="330" fill="#ffffff" />
      {/* Cantón azul */}
      <rect width="296.4" height="210" fill="#3c3b6e" />
      {/* Estrellas estilizadas */}
      <g fill="#ffffff" opacity="0.95">
        <circle cx="50" cy="40" r="8" />
        <circle cx="100" cy="40" r="8" />
        <circle cx="150" cy="40" r="8" />
        <circle cx="200" cy="40" r="8" />
        <circle cx="250" cy="40" r="8" />

        <circle cx="75" cy="75" r="8" />
        <circle cx="125" cy="75" r="8" />
        <circle cx="175" cy="75" r="8" />
        <circle cx="225" cy="75" r="8" />

        <circle cx="50" cy="110" r="8" />
        <circle cx="100" cy="110" r="8" />
        <circle cx="150" cy="110" r="8" />
        <circle cx="200" cy="110" r="8" />
        <circle cx="250" cy="110" r="8" />

        <circle cx="75" cy="145" r="8" />
        <circle cx="125" cy="145" r="8" />
        <circle cx="175" cy="145" r="8" />
        <circle cx="225" cy="145" r="8" />

        <circle cx="50" cy="180" r="8" />
        <circle cx="100" cy="180" r="8" />
        <circle cx="150" cy="180" r="8" />
        <circle cx="200" cy="180" r="8" />
        <circle cx="250" cy="180" r="8" />
      </g>
    </svg>
  );
}

/**
 * Selector universal de banderas por código de idioma
 */
export function FlagIcon({
  lang,
  className = "w-8 h-5.5 rounded overflow-hidden shadow-sm shrink-0 border border-white/10",
}: {
  lang: string;
  className?: string;
}) {
  const code = (lang || "").toLowerCase().trim();
  if (code === "pt" || code === "pt-br" || code === "br") {
    return <FlagBR className={className} />;
  }
  if (code === "es" || code === "es-es" || code === "es-419" || code === "lat") {
    return <FlagES className={className} />;
  }
  if (code === "en" || code === "en-us" || code === "us") {
    return <FlagUS className={className} />;
  }
  return (
    <div className={`${className} bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-300 uppercase`}>
      {code.slice(0, 2)}
    </div>
  );
}

export default FlagIcon;
