"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useHistory } from "@/hooks/useHistory";

// En el detalle de una serie: si hay último capítulo visto, botón para continuar.
export default function ContinueSeriesButton({ id }: { id: string }) {
  const { history } = useHistory();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  const last = history.find((h) => h.type === "tv" && String(h.id) === String(id));
  if (!last) return null;
  return (
    <Link
      href={`/watch?type=tv&id=${id}&s=${last.season}&e=${last.episode}`}
      className="bg-violet-600 hover:bg-violet-500 rounded-xl px-5 py-2.5 font-bold inline-block"
    >
      ▶ Continuar T{last.season}E{last.episode}
    </Link>
  );
}
