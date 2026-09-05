/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "image.tmdb.org" },
      { protocol: "https", hostname: "via.placeholder.com" },
      { protocol: "https", hostname: "*.metahub.space" },
      { protocol: "https", hostname: "static.tvmaze.com" },
      { protocol: "https", hostname: "m.media-amazon.com" },
    ],
  },
};
export default nextConfig;
