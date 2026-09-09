// Helper de imágenes, seguro para cliente y servidor.
export const img = (p: string | null | undefined, size: string = "w500") => {
  if (!p) return "/placeholder.svg";
  if (p.startsWith("http")) return p; // fuentes free (Cinemeta/TVMaze) ya traen URL completa
  return `https://image.tmdb.org/t/p/${size}${p}`;
};
