"use client";
import { useCallback, useEffect, useState } from "react";

// Panel admin simple: códigos de acceso + servidores + live. (Español, uso interno.)
type Code = { id: string; label: string; ref_code: string; expires_at: string; revoked: boolean; created_at: string };
type Prov = { id: string; name: string; movie_tpl: string; tv_tpl: string; needs_tmdb: boolean; tv_ok: boolean; entry_key: string; active: boolean; ord: number };
type Live = { id: string; name: string; format: string; list: string; active: boolean; ord: number };

const api = (p: string, init?: RequestInit) => fetch(`/api/admin/${p}`, { ...init, cache: "no-store" });

export default function AdminPage() {
  const [auth, setAuth] = useState(false);
  const [pass, setPass] = useState("");
  const [tab, setTab] = useState<"codes" | "prov" | "live">("codes");
  const [codes, setCodes] = useState<Code[]>([]);
  const [provs, setProvs] = useState<Prov[]>([]);
  const [live, setLive] = useState<Live[]>([]);
  const [version, setVersion] = useState("");
  const [label, setLabel] = useState("");
  const [days, setDays] = useState("30");
  const [newCode, setNewCode] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [edit, setEdit] = useState<Partial<Prov> & { _new?: boolean } | null>(null);
  const [editLive, setEditLive] = useState<Partial<Live> & { _new?: boolean } | null>(null);

  const load = useCallback(async () => {
    const [c, p, l] = await Promise.all([
      api("codes").then((r) => (r.ok ? r.json() : null)).catch(() => null),
      api("providers").then((r) => (r.ok ? r.json() : null)).catch(() => null),
      api("live").then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]);
    if (!c || !p) { setAuth(false); return; }
    setAuth(true);
    setCodes(c.codes || []);
    setProvs(p.providers || []);
    setVersion(p.version || "");
    setLive(l?.live || []);
  }, []);

  const [health, setHealth] = useState<string>("");
  useEffect(() => {
    fetch("/api/admin/health", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => { if (!j.supabase) setHealth(`Supabase no configurado: pon SUPABASE_URL/SERVICE_KEY en .env.local y Vercel`); })
      .catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await api("", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pass }) });
    if (r.ok) { setPass(""); load(); }
    else setMsg("Clave incorrecta");
  };

  if (!auth) {
    return (
      <div className="max-w-sm mx-auto py-16">
        <h1 className="text-2xl font-black mb-4">Admin</h1>
        {health && <p className="text-xs text-red-400 mb-3">{health}</p>}
        <form onSubmit={login} className="flex gap-2">
          <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Clave admin"
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-[#008CFF]" />
          <button className="px-5 py-2.5 rounded-xl bg-[#008CFF] font-bold text-sm">Entrar</button>
        </form>
        {msg && <p className="text-xs text-red-400 mt-2">{msg}</p>}
      </div>
    );
  }

  const createCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await api("codes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label, days: Number(days) || 30 }) });
    const j = await r.json();
    if (r.ok) { setNewCode(j as any); setLabel(""); load(); }
  };

  const saveProv = async () => {
    if (!edit?.id || !edit?.name || !edit?.movie_tpl || !edit?.tv_tpl) { setMsg("Completa id, nombre y plantillas"); return; }
    const r = await api("providers", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(edit) });
    if (r.ok) { setEdit(null); setMsg(""); load(); } else setMsg("Error guardando");
  };

  const saveLive = async () => {
    if (!editLive?.id || !editLive?.name || !editLive?.format || !editLive?.list) { setMsg("Completa todo"); return; }
    const r = await api("live", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editLive) });
    if (r.ok) { setEditLive(null); setMsg(""); load(); } else setMsg("Error guardando");
  };

  const inp = "w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-[#008CFF]";
  const btn = "px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs hover:border-[#008CFF]";

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <h1 className="text-2xl font-black mr-2">Admin</h1>
        {(["codes", "prov", "live"] as const).map((tb) => (
          <button key={tb} onClick={() => { setTab(tb); setMsg(""); }}
            className={`px-4 py-1.5 rounded-full text-xs font-bold border ${tab === tb ? "bg-[#008CFF] border-[#008CFF] text-white" : "border-white/15 text-zinc-400"}`}>
            {tb === "codes" ? `Códigos (${codes.length})` : tb === "prov" ? `Servidores (v${version || "?"})` : "Live"}
          </button>
        ))}
        <button onClick={() => fetch("/api/admin/logout", { method: "DELETE" }).then(() => setAuth(false))}
          className="ml-auto px-3 py-1.5 rounded-lg text-xs text-zinc-500 hover:text-red-400">Salir</button>
      </div>
      {msg && <p className="text-xs text-yellow-300 mb-3">{msg}</p>}

      {tab === "codes" && (
        <>
          <form onSubmit={createCode} className="flex gap-2 mb-3 flex-wrap">
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Etiqueta (ej. Familia)" className={`${inp} flex-1 min-w-40`} />
            <input value={days} onChange={(e) => setDays(e.target.value)} placeholder="Días" inputMode="numeric" className={`${inp} w-24`} />
            <button className="px-4 py-2 rounded-xl bg-[#008CFF] font-bold text-sm">+ Crear (30d por defecto)</button>
          </form>
          {newCode && (
            <p className="text-sm mb-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              Código (se muestra una sola vez, cópialo): <b className="tracking-widest">{newCode.code || newCode}</b>
              {newCode.ref_code && <> · Ref: <b className="tracking-widest">{newCode.ref_code}</b></>}
            </p>
          )}
          <div className="space-y-2">
            {codes.map((c) => {
              const exp = new Date(c.expires_at).getTime() < Date.now();
              const daysLeft = Math.ceil((new Date(c.expires_at).getTime() - Date.now()) / 86400000);
              return (
                <div key={c.id} className={`flex items-center gap-2 p-3 rounded-xl border ${c.revoked ? "border-amber-500/40 bg-amber-500/5" : exp ? "border-red-500/40 bg-red-500/5" : "border-white/10 bg-white/5"} flex-wrap`}>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm flex items-center gap-2">{c.label || "(sin etiqueta)"} {c.revoked && <span className="text-xs bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">revocado</span>} {exp && !c.revoked && <span className="text-xs bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded">caducado</span>}</span>
                    <span className="text-xs font-mono bg-white/5 border border-white/10 rounded px-1.5 py-0.5 w-fit">{c.ref_code}</span>
                    <span className="text-xs text-zinc-400">expira {new Date(c.expires_at).toLocaleDateString()} { !exp && !c.revoked && <span className="text-zinc-500">· {daysLeft}d restantes</span>}</span>
                  </div>
                  <span className="ml-auto flex gap-1.5 flex-wrap">
                    <button onClick={async () => { const r = await api("codes", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: c.id, renew: true, days: 30 }) }); const j = await r.json(); if (r.ok) { setNewCode({ code: j.code, ref_code: j.ref_code }); setMsg(`Renovado: nuevo código ${j.code} · Ref ${j.ref_code} (30d)`); load(); } else setMsg("Error renovando"); }} className={`${btn} bg-[#008CFF]/20 border-[#008CFF]/30 hover:bg-[#008CFF]/30`}>Renovar 30d</button>
                    <button onClick={async () => { const r = await api("codes", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: c.id, extendDays: 30 }) }); if (r.ok) { setMsg("Extendido 30 días"); load(); } else setMsg("Error extendiendo"); }} className={btn}>+30d</button>
                    <button onClick={() => api("codes", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: c.id, revoked: !c.revoked }) }).then(load)} className={btn}>
                      {c.revoked ? "Reactivar" : "Revocar"}
                    </button>
                    <button onClick={() => { if (confirm("¿Borrar código? Esto cerrará sesiones activas de ese código.")) api(`codes?id=${c.id}`, { method: "DELETE" }).then(load); }} className={`${btn} hover:!border-red-500 hover:text-red-400`}>Borrar</button>
                  </span>
                </div>
              );
            })}
            {!codes.length && <p className="text-sm text-zinc-500 text-center py-4">Sin códigos. Crea el primero arriba.</p>}
          </div>
        </>
      )}

      {tab === "prov" && (
        <>
          <button onClick={() => setEdit({ _new: true, active: true, needs_tmdb: false, tv_ok: false, ord: provs.length } as any)}
            className="mb-3 px-4 py-2 rounded-xl bg-[#008CFF] font-bold text-sm">+ Nuevo servidor</button>
          <div className="space-y-2">
            {provs.map((p) => (
              <div key={p.id} className="p-2.5 rounded-xl border border-white/10 bg-white/5 flex items-center gap-2 flex-wrap">
                <b className="text-sm">{p.name}</b>
                <code className="text-xs text-zinc-500">{p.id}</code>
                {!p.active && <span className="text-xs text-red-400">off</span>}
                {p.tv_ok && <span className="text-xs text-emerald-400">tv</span>}
                <span className="ml-auto flex gap-2">
                  <button onClick={() => api("providers", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id, active: !p.active }) }).then(load)} className={btn}>
                    {p.active ? "Desactivar" : "Activar"}
                  </button>
                  <button onClick={() => setEdit({ ...p })} className={btn}>Editar</button>
                  <button onClick={() => { if (confirm(`¿Borrar ${p.name}?`)) api(`providers?id=${p.id}`, { method: "DELETE" }).then(load); }} className={`${btn} hover:!border-red-500 hover:text-red-400`}>Borrar</button>
                </span>
              </div>
            ))}
          </div>
          {edit && (
            <div className="mt-4 p-4 rounded-2xl border border-[#008CFF]/40 bg-black/40 space-y-2">
              <h3 className="font-bold text-sm">{edit._new ? "Nuevo servidor" : `Editar ${edit.id}`}</h3>
              <div className="grid sm:grid-cols-2 gap-2">
                <input value={edit.id || ""} disabled={!edit._new} onChange={(e) => setEdit({ ...edit, id: e.target.value })} placeholder="id (ej. vidcore)" className={inp} />
                <input value={edit.name || ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="Nombre" className={inp} />
              </div>
              <input value={edit.movie_tpl || ""} onChange={(e) => setEdit({ ...edit, movie_tpl: e.target.value })} placeholder="Plantilla movie (…{id}…)" className={`${inp} font-mono`} />
              <input value={edit.tv_tpl || ""} onChange={(e) => setEdit({ ...edit, tv_tpl: e.target.value })} placeholder="Plantilla tv (…{id}…{s}…{e}…)" className={`${inp} font-mono`} />
              <input value={edit.entry_key || ""} onChange={(e) => setEdit({ ...edit, entry_key: e.target.value })} placeholder="key propia (opcional, ej. view_key)" className={`${inp} font-mono`} />
              <div className="flex gap-4 text-xs">
                <label className="flex items-center gap-1.5"><input type="checkbox" checked={!!edit.needs_tmdb} onChange={(e) => setEdit({ ...edit, needs_tmdb: e.target.checked })} /> needsTmdb</label>
                <label className="flex items-center gap-1.5"><input type="checkbox" checked={!!edit.tv_ok} onChange={(e) => setEdit({ ...edit, tv_ok: e.target.checked })} /> tvOk (mando)</label>
                <label className="flex items-center gap-1.5"><input type="checkbox" checked={edit.active !== false} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> activo</label>
                <input value={edit.ord ?? 0} onChange={(e) => setEdit({ ...edit, ord: Number(e.target.value) })} placeholder="orden" inputMode="numeric" className={`${inp} w-20`} />
              </div>
              <p className="text-[11px] text-zinc-500">Placeholders: {"{id} {s} {e} {key} {idparam} {tmdbflag}"} · cada guardado sube la versión automáticamente.</p>
              <div className="flex gap-2">
                <button onClick={saveProv} className="px-4 py-2 rounded-xl bg-[#008CFF] font-bold text-sm">Guardar</button>
                <button onClick={() => { setEdit(null); setMsg(""); }} className={btn}>Cancelar</button>
              </div>
            </div>
          )}
        </>
      )}

      {tab === "live" && (
        <>
          <button onClick={() => setEditLive({ _new: true, active: true, format: "tvf90", ord: live.length } as any)}
            className="mb-3 px-4 py-2 rounded-xl bg-[#008CFF] font-bold text-sm">+ Nueva fuente</button>
          <div className="space-y-2">
            {live.map((l) => (
              <div key={l.id} className="p-2.5 rounded-xl border border-white/10 bg-white/5 flex items-center gap-2 flex-wrap">
                <b className="text-sm">{l.name}</b>
                <code className="text-xs text-zinc-500">{l.id} · {l.format}</code>
                {!l.active && <span className="text-xs text-red-400">off</span>}
                <span className="ml-auto flex gap-2">
                  <button onClick={() => api("live", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: l.id, active: !l.active }) }).then(load)} className={btn}>
                    {l.active ? "Desactivar" : "Activar"}
                  </button>
                  <button onClick={() => setEditLive({ ...l })} className={btn}>Editar</button>
                  <button onClick={() => { if (confirm(`¿Borrar ${l.name}?`)) api(`live?id=${l.id}`, { method: "DELETE" }).then(load); }} className={`${btn} hover:!border-red-500 hover:text-red-400`}>Borrar</button>
                </span>
              </div>
            ))}
          </div>
          {editLive && (
            <div className="mt-4 p-4 rounded-2xl border border-[#008CFF]/40 bg-black/40 space-y-2">
              <div className="grid sm:grid-cols-2 gap-2">
                <input value={editLive.id || ""} disabled={!editLive._new} onChange={(e) => setEditLive({ ...editLive, id: e.target.value })} placeholder="id" className={inp} />
                <input value={editLive.name || ""} onChange={(e) => setEditLive({ ...editLive, name: e.target.value })} placeholder="Nombre" className={inp} />
                <input value={editLive.format || ""} onChange={(e) => setEditLive({ ...editLive, format: e.target.value })} placeholder="format: streambetter|tvf90" className={inp} />
                <input value={editLive.ord ?? 0} onChange={(e) => setEditLive({ ...editLive, ord: Number(e.target.value) })} placeholder="orden" inputMode="numeric" className={inp} />
              </div>
              <input value={editLive.list || ""} onChange={(e) => setEditLive({ ...editLive, list: e.target.value })} placeholder="URL del listado" className={`${inp} font-mono`} />
              <div className="flex gap-2">
                <button onClick={saveLive} className="px-4 py-2 rounded-xl bg-[#008CFF] font-bold text-sm">Guardar</button>
                <button onClick={() => { setEditLive(null); setMsg(""); }} className={btn}>Cancelar</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
