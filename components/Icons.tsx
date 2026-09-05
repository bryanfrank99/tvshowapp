// Set de iconos SVG propio (sin emojis): profesional y consistente.
type P = { size?: number; className?: string };

const base = (size = 16) => ({ width: size, height: size, viewBox: "0 0 24 24", fill: "currentColor" as const });

export const IconPlay = ({ size = 16, className = "" }: P) => (
  <svg {...base(size)} className={className}><path d="M8 5.5v13l11-6.5-11-6.5z" /></svg>
);
export const IconStar = ({ size = 14, className = "" }: P) => (
  <svg {...base(size)} className={className}><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 20.9l1.6-7L2 9.2l7.1-.6L12 2z" /></svg>
);
export const IconHeart = ({ size = 16, className = "", filled = true }: P & { filled?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} className={className}>
    <path d="M12 21s-7.5-4.9-10-9.3C.4 8.6 2.2 5 5.7 5c2 0 3.4 1.1 4.3 2.4h4c.9-1.3 2.3-2.4 4.3-2.4 3.5 0 5.3 3.6 3.7 6.7C19.5 16.1 12 21 12 21z" transform="scale(0.92) translate(1,0)" />
  </svg>
);
export const IconClock = ({ size = 18, className = "" }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
    <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" strokeLinecap="round" />
  </svg>
);
export const IconFilm = ({ size = 18, className = "" }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
    <rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" />
  </svg>
);
export const IconTv = ({ size = 18, className = "" }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
    <rect x="3" y="5" width="18" height="12" rx="2" /><path d="M9 21h6" strokeLinecap="round" />
  </svg>
);
export const IconSignal = ({ size = 18, className = "" }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
    <path d="M5 12.5a10 10 0 0114 0M8 15.5a6 6 0 018 0" strokeLinecap="round" /><circle cx="12" cy="18.5" r="1.6" fill="currentColor" stroke="none" />
  </svg>
);
export const IconTrophy = ({ size = 18, className = "" }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
    <path d="M8 4h8v5a4 4 0 01-8 0V4zM8 5H4a1 1 0 00-1 1c0 3 2 5 5 5M16 5h4a1 1 0 011 1c0 3-2 5-5 5M12 13v4M8 20h8M10 17h4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
export const IconSparkles = ({ size = 18, className = "" }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2l1.8 5.7L19.5 9l-5.7 1.8L12 16.5l-1.8-5.7L4.5 9l5.7-1.3L12 2zm7 11l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9.9-2.6z" />
  </svg>
);
export const IconFire = ({ size = 18, className = "" }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 22c4.4 0 8-3.6 8-8 0-3.5-2.5-6.5-5-8.5C14 4 13 2.5 13 2s-4 3.5-5 7c-.8-.5-1.5-1.3-2-2.5C4.7 8.6 4 10.7 4 14c0 4.4 3.6 8 8 8zm1-4.5c-1.4 0-2.5-1.1-2.5-2.5 0-1.2.9-2.3 1.9-3.1.3 1 .9 1.9 1.9 2.4-.2-1.2-.1-2.7.5-4.2 1.2 1.1 2.2 2.7 2.2 4.9 0 1.4-1.1 2.5-2.5 2.5h-1.5z" />
  </svg>
);
export const IconCalendar = ({ size = 18, className = "" }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
    <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
  </svg>
);
export const IconX = ({ size = 14, className = "" }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className={className}>
    <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
  </svg>
);
export const IconChevronL = ({ size = 20, className = "" }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className={className}>
    <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
export const IconChevronR = ({ size = 20, className = "" }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className={className}>
    <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
export const IconBall = ({ size = 18, className = "" }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
    <circle cx="12" cy="12" r="9" /><path d="M12 7l3 2.2-1.2 3.6h-3.6L9 9.2 12 7zM12 3v4M5.5 9.5l3.5.7M18.5 9.5l-3.5.7M7 17.5l2-2.7M17 17.5l-2-2.7" strokeLinejoin="round" />
  </svg>
);
