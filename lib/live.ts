// TV en vivo vía API pública de StreamBetter (sin key, CORS abierto).
// Canales → embed https://streambetter.shop/canal/{slug}

export type Channel = { name: string; slug: string; image: string; url: string };

export function slugify(name: string) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function getChannels(limit = 60, q = ""): Promise<Channel[]> {
  const params = new URLSearchParams({ limit: String(Math.min(limit, 100)) });
  if (q) params.set("q", q);
  const r = await fetch(`https://streambetter.shop/api/channels?${params}`, { next: { revalidate: 600 } });
  if (!r.ok) throw new Error("channels " + r.status);
  const j = await r.json();
  return (j.channels || []).map((c: any) => {
    const url: string = c.url || "";
    // Si la API ya trae URL de embed, úsala; si no, construye por slug.
    const embed = url.startsWith("http") ? url : `https://streambetter.shop/canal/${slugify(c.name)}`;
    return { name: c.name, slug: slugify(c.name), image: c.image || "", url: embed };
  });
}
