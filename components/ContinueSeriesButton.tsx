"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useHistory } from "@/hooks/useHistory";
import { IconPlay } from "@/components/Icons";
import { useLang } from "@/hooks/useLang";
import { t } from "@/lib/dict";

// En el detalle de una serie: "Ver ahora" si nunca vista (S1E1), "Continuar T/E" si ya hay historial.
export default function ContinueSeriesButton({ id }: { id: string }) {
  const { history } = useHistory();
  const { lang } = useLang();
  const d = t(lang);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  const last = history.find((h) => h.type === "tv" && String(h.id) === String(id));
  if (!last) {
    return (
      <Link
        href={`/watch?type=tv&id=${id}&s=1&e=1`}
        className="bg-[#008CFF] rounded-xl px-5 py-2.5 font-bold inline-flex items-center gap-2 text-sm"
      >
        <IconPlay size={15} />{d.ver_ahora_btn}
      </Link>
    );
  }
  return (
    <Link
      href={`/watch?type=tv&id=${id}&s=${last.season}&e=${last.episode}`}
      className="bg-[#008CFF] hover:bg-[#008CFF] rounded-xl px-5 py-2.5 font-bold inline-flex items-center gap-2 text-sm"
    >
      <IconPlay size={15} />{d.continuar} {d.tv_t}{last.season}{d.ep_e}{last.episode}
    </Link>
  );
}

