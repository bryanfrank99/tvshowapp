import { join } from "path";

// Base estática para Capacitor: `npm run build:static` activa export 100% estático
// (sin API routes ni SSR). En ese modo "@/lib/db" se aliasa a IndexedDB.
const isStatic = process.env.OUTPUT_EXPORT === "1";

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(isStatic ? { output: "export" } : {}),
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "image.tmdb.org" },
      { protocol: "https", hostname: "via.placeholder.com" },
      { protocol: "https", hostname: "*.metahub.space" },
      { protocol: "https", hostname: "static.tvmaze.com" },
      { protocol: "https", hostname: "m.media-amazon.com" },
    ],
    ...(isStatic ? { unoptimized: true } : {}),
  },
  webpack: (config) => {
    if (isStatic) {
      config.resolve.alias["@/lib/db"] = join(__dirname, "lib", "db-idb.ts");
    }
    return config;
  },
};
export default nextConfig;
