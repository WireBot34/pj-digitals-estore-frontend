import React, { useCallback, useEffect, useState } from "react";
import { Repeat } from "lucide-react";
import { api, money } from "../api";

const EVERY = [[7, "Every week"], [14, "Every 2 weeks"], [30, "Every month"]];
const when = (d) => new Date(d).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

/** "Repeat this order" on a delivered order: pick how often; we remind the customer when it is due. */
export function RepeatButton({ order, token, tell, onSaved }) {
  const [open, setOpen] = useState(false);
  const [every, setEvery] = useState(7);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try { await api("/api/subscriptions", { token: await token(), method: "POST", body: { orderId: order._id, everyDays: every } }); tell("Saved. We will remind you when it is time."); setOpen(false); onSaved?.(); }
    catch (e) { tell(e.message, "error"); } finally { setBusy(false); }
  };
  if (!open) return <button onClick={() => setOpen(true)} className="btn-secondary px-4 py-2"><Repeat size={15}/> Repeat</button>;
  return <span className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-1.5">
    <select aria-label="How often" className="input py-1.5 text-sm" value={every} onChange={(e) => setEvery(Number(e.target.value))}>{EVERY.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
    <button disabled={busy} onClick={save} className="btn-primary px-3 py-1.5 text-sm">Save</button>
    <button onClick={() => setOpen(false)} className="text-xs font-semibold text-slate-500 underline">Cancel</button>
  </span>;
}

/** The customer's repeat orders: add to cart in one tap, pause, or remove. */
export function RepeatOrders({ token, tell, refreshCartCount, goCart, reloadKey }) {
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState("");
  const load = useCallback(async () => { try { setRows((await api("/api/subscriptions", { token: await token() })).data || []); } catch { setRows([]); } }, [token]);
  useEffect(() => { load(); }, [load, reloadKey]);
  if (!rows.length) return null;

  const call = async (id, path, method, body) => { setBusy(id); try { await api(`/api/subscriptions/${id}${path}`, { token: await token(), method, body }); await load(); } catch (e) { tell(e.message, "error"); } finally { setBusy(""); } };
  const orderNow = async (s) => {
    setBusy(s._id);
    let ok = 0;
    try {
      const t = await token();
      for (const it of s.items) {
        if (!it.product?.isActive) continue;
        try { await api("/api/cart/add", { token: t, method: "POST", body: { productId: it.product._id, quantity: it.quantity, size: it.size || undefined } }); ok += 1; } catch { /* sold out */ }
      }
      await refreshCartCount?.();
      if (!ok) { tell("These items are not available right now.", "error"); return; }
      await api(`/api/subscriptions/${s._id}/done`, { token: t, method: "POST" });
      tell(ok === s.items.length ? "Added to your cart." : "Some items are unavailable. The rest are in your cart.");
      goCart?.();
    } catch (e) { tell(e.message, "error"); } finally { setBusy(""); }
  };

  return <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4" aria-label="Repeat orders">
    <h2 className="flex items-center gap-2 font-display text-base font-bold"><Repeat size={16}/> Your repeat orders</h2>
    <ul className="mt-3 divide-y divide-slate-100">{rows.map((s) => {
      const total = s.items.reduce((a, i) => a + (i.product?.isActive ? i.product.price : 0) * i.quantity, 0);
      return <li key={s._id} className="py-3" data-testid="repeat-row">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold capitalize">{s.name}</p>
            <p className="text-xs text-slate-500">{s.items.map((i) => `${i.product?.name || "Removed item"} × ${i.quantity}`).join(", ")}</p>
            <p className="mt-1 text-xs text-slate-600">{s.active ? <>Every {s.everyDays} days · next reminder {when(s.nextAt)}</> : "Paused"} · about {money(total)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button disabled={busy === s._id} onClick={() => orderNow(s)} className="btn-primary px-3 py-1.5 text-sm">Order now</button>
            <button disabled={busy === s._id} onClick={() => call(s._id, "", "PUT", { active: !s.active })} className="btn-secondary px-3 py-1.5 text-sm">{s.active ? "Pause" : "Resume"}</button>
            <button disabled={busy === s._id} onClick={() => call(s._id, "", "DELETE")} className="px-2 text-xs font-semibold text-slate-500 underline">Remove</button>
          </div>
        </div>
      </li>;
    })}</ul>
  </section>;
}
