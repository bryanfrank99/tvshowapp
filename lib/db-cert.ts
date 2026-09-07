// Helpers puros sin dependencias de Node (compartidos SQLite/IndexedDB).
export function certOf(m: any): string {
  try {
    const us = (m.release_dates?.results || []).find((r: any) => r.iso_3166_1 === "US");
    const rel = (us?.release_dates || []).find((x: any) => x.certification) || (us?.release_dates || [])[0];
    if (rel?.certification) return rel.certification;
    const rt = (m.content_ratings?.results || []).find((r: any) => r.iso_3166_1 === "US");
    return rt?.rating || "";
  } catch {
    return "";
  }
}
