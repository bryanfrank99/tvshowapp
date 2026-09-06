"use client";
import { useState } from "react";
import { useLang } from "@/hooks/useLang";
import { t } from "@/lib/dict";

// Puerta romántica: pregunta por la canción; si acierta, muestra el video.
export default function LoveGate({ label }: { label: string }) {
  const { lang } = useLang();
  const d = t(lang);
  const [open, setOpen] = useState(false);
  const [answer, setAnswer] = useState("");
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState(false);

  const close = () => { setOpen(false); setAnswer(""); setOk(false); setErr(false); };
  const check = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const r = await fetch("/api/lovegate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer }),
      });
      const j = await r.json();
      if (j.ok) { setOk(true); setErr(false); }
      else setErr(true);
    } catch {
      setErr(true);
    }
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="hover:text-red-400 transition">
        {label}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={close}>
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#14141c] p-6 text-center" onClick={(e) => e.stopPropagation()}>
            {!ok ? (
              <form onSubmit={check}>
                <p className="text-2xl mb-1">❤️</p>
                <h3 className="text-lg font-black mb-1">{d.love_q}</h3>
                <p className="text-sm text-zinc-400 mb-4">{d.love_ask}</p>
                <input value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder={d.love_ph}
                  autoFocus
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-center outline-none focus:border-red-400 mb-3" />
                {err && <p className="text-xs text-red-400 mb-3">{d.love_wrong}</p>}
                <div className="flex gap-2 justify-center">
                  <button type="submit" className="px-5 py-2 rounded-xl bg-red-500 hover:bg-red-400 font-bold text-sm">{d.love_answer}</button>
                  <button type="button" onClick={close} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm">{d.love_close}</button>
                </div>
              </form>
            ) : (
              <>
                <p className="text-sm text-zinc-300 mb-3">{d.love_ok}</p>
                <video src="/nena-love.mp4" controls autoPlay playsInline className="w-full rounded-xl bg-black" />
                <button onClick={close} className="mt-4 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm">{d.love_close}</button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
