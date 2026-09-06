import Link from "next/link";
import { getLang } from "@/lib/tmdb";
import { t } from "@/lib/dict";

export const metadata = { title: "DMCA — TVShow" };

export default function DmcaPage() {
  const d = t(getLang());
  return (
    <div className="max-w-3xl mx-auto py-6 text-sm text-zinc-300 space-y-4">
      <h1 className="text-3xl font-black text-white">{d.dmca_title}</h1>
      <p className="text-xs text-zinc-500">{d.dmca_updated}</p>
      <section className="space-y-2">
        <h2 className="text-lg font-bold text-white">{d.dmca_h1}</h2>
        <p>{d.dmca_p1}</p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-bold text-white">{d.dmca_h2}</h2>
        <p>{d.dmca_p2}</p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-bold text-white">{d.dmca_h3}</h2>
        <p>{d.dmca_p3}</p>
        <ul className="list-disc pl-6 space-y-1">
          {d.dmca_li.map((li, k) => <li key={k}>{li}</li>)}
        </ul>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-bold text-white">{d.dmca_h4}</h2>
        <p>{d.dmca_p4}</p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-bold text-white">{d.dmca_h5}</h2>
        <p>{d.dmca_p5}</p>
      </section>
      <p><Link href="/" className="text-[#008CFF] underline">{d.dmca_back}</Link></p>
    </div>
  );
}
