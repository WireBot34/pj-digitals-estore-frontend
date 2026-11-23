import React, { useCallback, useEffect, useRef, useState } from "react";
import { Download, Edit3, Upload, History, Minus, Plus, ScanLine, Search, SlidersHorizontal, X } from "lucide-react";
import { api, download, imageOf, money, sized } from "../api";
import { useList } from "../useList";
import { Empty, Loading, Pager, Pill, cx } from "../ui";
import { ScanModal, canScan } from "../scanner";
import { ProductModal } from "./Admin";
import { Modal } from "./admin/common";

const REASONS = {
  restock: "Received", sale: "Sold", cancel: "Back from cancelled order", adjust: "Adjusted",
  count: "Stock count", damage: "Damaged / lost", return: "Customer return",
};
const when = (d) => new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const looksLikeCode = (s) => /^[A-Za-z0-9][A-Za-z0-9._-]{2,31}$/.test(s);
const thumb = (p) => { const src = sized(imageOf(p.images), "sm"); return <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-slate-100">{src && <img src={src} className="h-full w-full object-cover" alt=""/>}</div>; };

export function Stock({ token, tell }) {
  const [tick, setTick] = useState(0); // bump to refresh the totals and the list
  const [adding, setAdding] = useState(null); // { barcode } when adding a new product from the receive panel
  const refresh = () => setTick((n) => n + 1);

  const saveNew = async (fd) => {
    try { await api("/api/products", { token: await token(), method: "POST", body: fd }); tell("Product added."); setAdding(null); refresh(); }
    catch (e) { tell(e.message, "error"); }
  };

  return <>
    <div className="mb-6"><h2 className="text-2xl font-extrabold">Stock</h2><p className="mt-1 text-sm text-slate-500">Scan items in when new stock arrives, keep counts right, and see what your stock is worth.</p></div>
    <Summary token={token} tell={tell} tick={tick}/>
    <ReceivePanel token={token} tell={tell} onSaved={refresh} onAddNew={(barcode) => setAdding({ barcode })}/>
    <Inventory token={token} tell={tell} tick={tick} onChanged={refresh}/>
    {adding && <ProductModal owner initialBarcode={adding.barcode} token={token} tell={tell} save={saveNew} close={() => setAdding(null)}/>}
  </>;
}

/* ---------------------------------------------------------------- totals */
function Summary({ token, tell, tick }) {
  const [s, setS] = useState(null);
  useEffect(() => { (async () => { try { setS((await api("/api/shop/inventory/summary", { token: await token() })).data); } catch (e) { tell(e.message, "error"); } })(); }, [tick, token, tell]);
  if (!s) return <div className="mb-6"><Loading/></div>;
  const tiles = [
    ["Products", s.products, `${s.units} items in stock`],
    ["Stock value at cost", money(s.valueAtCost), s.withoutCost ? `${s.withoutCost} product${s.withoutCost === 1 ? "" : "s"} have no cost price yet` : "What you paid for it"],
    ["Stock value at store price", money(s.valueAtPrice), "If all of it sold today"],
    ["Expected profit", money(s.expectedProfit), "Only counts products with a cost price"],
  ];
  return <div className="mb-6">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{tiles.map(([t, v, note]) => <div key={t} className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold text-slate-500">{t}</p><p className="mt-1 text-2xl font-extrabold">{v}</p><p className="mt-1 text-xs text-slate-400">{note}</p></div>)}</div>
    {(s.out > 0 || s.low > 0) && <div className="mt-3 flex flex-wrap gap-2 text-sm">{s.out > 0 && <Pill tone="red">{s.out} out of stock</Pill>}{s.low > 0 && <Pill tone="amber">{s.low} running low (≤ {s.lowStockLevel})</Pill>}</div>}
  </div>;
}

/* --------------------------------------------------------- receive stock */
function ReceivePanel({ token, tell, onSaved, onAddNew }) {
  const [text, setText] = useState("");
  const [batch, setBatch] = useState([]); // [{ product, qty, cost }]
  const [missing, setMissing] = useState(null); // { barcode, catalog }
  const [suggest, setSuggest] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const input = useRef(null);

  const addProduct = useCallback((product) => {
    setMissing(null);
    setBatch((b) => b.some((x) => x.product._id === product._id)
      ? b.map((x) => (x.product._id === product._id ? { ...x, qty: x.qty + 1 } : x))
      : [{ product, qty: 1, cost: product.costPrice ?? "" }, ...b]);
  }, []);

  const addCode = useCallback(async (raw) => {
    const code = String(raw || "").trim();
    if (!looksLikeCode(code)) return false;
    try {
      const r = (await api(`/api/shop/inventory/lookup?barcode=${encodeURIComponent(code)}`, { token: await token() })).data;
      if (r.inShop) { addProduct(r.inShop); return true; }
      setMissing({ barcode: code, catalog: r.catalog });
      return false;
    } catch (e) { tell(e.message, "error"); return false; }
  }, [token, tell, addProduct]);

  // name / code suggestions
  useEffect(() => {
    const q = text.trim();
    if (q.length < 2) { setSuggest([]); return; }
    let live = true;
    const t = setTimeout(async () => {
      try { const r = await api(`/api/shop/inventory?search=${encodeURIComponent(q)}&limit=6`, { token: await token() }); if (live) setSuggest(r.data || []); } catch { /* suggestions are optional */ }
    }, 250);
    return () => { live = false; clearTimeout(t); };
  }, [text, token]);

  const submit = async () => {
    const q = text.trim();
    if (!q) return;
    const exact = suggest.find((p) => p.barcode === q || p.sku === q);
    if (exact) { addProduct(exact); } else if (!(await addCode(q)) && suggest.length === 1 && !looksLikeCode(q)) { addProduct(suggest[0]); }
    setText(""); setSuggest([]);
    input.current?.focus();
  };

  const setQty = (id, qty) => setBatch((b) => b.map((x) => (x.product._id === id ? { ...x, qty } : x)));
  const setCost = (id, cost) => setBatch((b) => b.map((x) => (x.product._id === id ? { ...x, cost } : x)));
  const drop = (id) => setBatch((b) => b.filter((x) => x.product._id !== id));
  const units = batch.reduce((n, x) => n + (Number(x.qty) || 0), 0);
  const bad = batch.some((x) => !Number.isInteger(Number(x.qty)) || Number(x.qty) < 1);

  const save = async () => {
    setSaving(true);
    try {
      const r = await api("/api/shop/inventory/receive", { token: await token(), method: "POST", body: { items: batch.map((x) => ({ productId: x.product._id, quantity: Number(x.qty), costPrice: String(x.cost).trim() === "" ? undefined : Number(x.cost) })) } });
      tell(r.message || "Stock received.");
      setBatch([]); onSaved();
    } catch (e) {
      // lines that failed stay in the batch so nothing is lost
      const failed = (e.data?.data || []).filter((l) => !l.ok).map((l) => String(l.productId));
      if (failed.length) setBatch((b) => b.filter((x) => failed.includes(String(x.product._id))));
      if (e.data?.data?.some((l) => l.ok)) onSaved();
      tell(e.message, "error");
    } finally { setSaving(false); }
  };

  return <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-extrabold">Receive stock</h3><p className="text-xs text-slate-500">Scan each item as you unpack it, or type a name or code. Scanning the same item again adds one more.</p></div></div>
    <div className="relative mt-3 flex gap-2">
      <div className="relative flex-1"><Search size={16} className="pointer-events-none absolute left-3 top-3.5 text-slate-400"/>
        <input ref={input} className="input pl-9" placeholder="Barcode, name or item code" value={text} autoComplete="off" onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } }}/>
        {suggest.length > 0 && <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">{suggest.map((p) => <li key={p._id}><button type="button" onClick={() => { addProduct(p); setText(""); setSuggest([]); input.current?.focus(); }} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-slate-50">{thumb(p)}<span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{p.name}</span><span className="block truncate text-xs text-slate-500">{[p.barcode, p.brand].filter(Boolean).join(" · ") || "No barcode"} · {p.stock} in stock</span></span></button></li>)}</ul>}
      </div>
      {canScan() && <button type="button" onClick={() => setScanning(true)} className="btn-primary shrink-0"><ScanLine size={18}/> Scan</button>}
    </div>
    {!canScan() && <p className="mt-2 text-xs text-slate-400">Camera scanning isn't available in this browser (Chrome on Android works). A USB or Bluetooth scanner still works: click the box and scan.</p>}

    {missing && <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
      <p><b>{missing.barcode}</b> isn't one of your products{missing.catalog ? <> — the shared catalogue knows it as <b>{missing.catalog.name}</b>.</> : "."}</p>
      <div className="mt-2 flex gap-2"><button type="button" className="btn-primary px-3 py-2 text-xs" onClick={() => { onAddNew(missing.barcode); setMissing(null); }}>Add it as a new product</button><button type="button" className="btn-secondary px-3 py-2 text-xs" onClick={() => setMissing(null)}>Dismiss</button></div></div>}

    {batch.length > 0 && <div className="mt-4">
      <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm">
        <thead className="text-xs uppercase tracking-wider text-slate-500"><tr><th className="py-2 pr-3">Product</th><th className="py-2 pr-3">Now</th><th className="py-2 pr-3">Receiving</th><th className="py-2 pr-3">Cost each (₹)</th><th className="py-2"></th></tr></thead>
        <tbody className="divide-y divide-slate-100">{batch.map((x) => <tr key={x.product._id}>
          <td className="py-2 pr-3"><div className="flex items-center gap-3">{thumb(x.product)}<div className="min-w-0"><p className="truncate font-bold">{x.product.name}</p><p className="truncate text-xs text-slate-500">{x.product.barcode || "No barcode"}</p></div></div></td>
          <td className="py-2 pr-3 text-slate-600">{x.product.stock}</td>
          <td className="py-2 pr-3"><div className="flex items-center gap-1"><button type="button" className="qty" aria-label="One less" onClick={() => setQty(x.product._id, Math.max(1, (Number(x.qty) || 1) - 1))}><Minus size={14}/></button>
            <input className="input w-16 px-2 py-1 text-center" inputMode="numeric" aria-label="Quantity" value={x.qty} onChange={(e) => setQty(x.product._id, e.target.value.replace(/\D/g, ""))}/>
            <button type="button" className="qty" aria-label="One more" onClick={() => setQty(x.product._id, (Number(x.qty) || 0) + 1)}><Plus size={14}/></button></div></td>
          <td className="py-2 pr-3"><input className="input w-24 px-2 py-1" inputMode="decimal" aria-label="Cost each" placeholder="optional" value={x.cost} onChange={(e) => setCost(x.product._id, e.target.value)}/></td>
          <td className="py-2"><button type="button" aria-label="Remove" onClick={() => drop(x.product._id)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={16}/></button></td></tr>)}</tbody></table></div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-600">{batch.length} product{batch.length === 1 ? "" : "s"}, {units} item{units === 1 ? "" : "s"}. Cost is saved as the latest cost price.</p>
        <div className="flex gap-2"><button type="button" className="btn-secondary" onClick={() => setBatch([])}>Clear</button><button type="button" disabled={saving || bad} onClick={save} className="btn-primary">{saving ? "Saving..." : "Add to stock"}</button></div></div>
    </div>}
    {scanning && <ScanModal continuous title="Scan items to receive" onCode={(c) => { addCode(c); }} onClose={() => setScanning(false)}/>}
  </section>;
}

/* ------------------------------------------------------------- inventory */
function Inventory({ token, tell, tick, onChanged }) {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("updated");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => { const t = setTimeout(() => { setQ(search.trim()); setPage(1); }, 350); return () => clearTimeout(t); }, [search]);
  const { data, pagination, loading } = useList("/api/shop/inventory", { page, limit: 15, filter, sort, search: q, t: tick }, token, tell);
  const [editing, setEditing] = useState(null);
  const [history, setHistory] = useState(null);
  const [adjusting, setAdjusting] = useState(null);
  const changed = async () => { onChanged(); }; // bumping the counter re-runs the list query

  const quick = async (p, body) => {
    try { await api(`/api/shop/inventory/${p._id}/adjust`, { token: await token(), method: "POST", body }); await changed(); return true; }
    catch (e) { tell(e.message, "error"); return false; }
  };
  const save = async (fd, id) => {
    try { await api(`/api/products/${id}`, { token: await token(), method: "PUT", body: fd }); tell("Product updated."); setEditing(null); await changed(); }
    catch (e) { tell(e.message, "error"); }
  };
  const [importing, setImporting] = useState(false);
  const exportCsv = async () => { try { await download("/api/shop/inventory/export.csv", await token(), "my-stock.csv"); } catch (e) { tell(e.message, "error"); } };

  const chips = [["all", "All"], ["low", "Running low"], ["out", "Out of stock"], ["in", "Well stocked"]];
  return <section>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-extrabold">All products</h3>
      <div className="flex flex-wrap items-center gap-2"><div className="relative"><Search className="absolute left-3 top-3 text-slate-400" size={16}/><input className="input pl-9" placeholder="Search name, barcode, brand" value={search} onChange={(e) => setSearch(e.target.value)}/></div>
        <select className="input" aria-label="Sort" value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }}><option value="updated">Recently changed</option><option value="name">Name A–Z</option><option value="stock_asc">Stock: low to high</option><option value="stock_desc">Stock: high to low</option></select>
        <button type="button" onClick={exportCsv} className="btn-secondary"><Download size={16}/> Export</button>
        <button type="button" onClick={() => setImporting(true)} className="btn-secondary"><Upload size={16}/> Import CSV</button></div></div>
    <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto">{chips.map(([k, label]) => <button key={k} type="button" onClick={() => { setFilter(k); setPage(1); }} className={cx("shrink-0 rounded-full border px-4 py-2 text-sm font-semibold", filter === k ? "border-ink bg-ink text-white" : "border-slate-200 bg-white text-slate-600")}>{label}</button>)}</div>
    {loading ? <Loading/> : !data.length ? <Empty title="Nothing here" detail={q || filter !== "all" ? "No products match. Try another filter or search." : "Add products on the Products tab, or scan a barcode above to add your first one."}/> :
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-4">Product</th><th className="px-5 py-4">Store price</th><th className="px-5 py-4">Cost</th><th className="px-5 py-4">Stock</th><th className="px-5 py-4">Value at cost</th><th className="px-5 py-4 text-right">Actions</th></tr></thead>
        <tbody className="divide-y divide-slate-100">{data.map((p) => <tr key={p._id}>
          <td className="px-5 py-4"><div className="flex items-center gap-3">{thumb(p)}<div className="min-w-0"><p className="font-bold">{p.name}</p><p className="text-xs text-slate-500">{[p.barcode, p.brand, p.unit].filter(Boolean).join(" · ") || "No barcode"}</p></div></div></td>
          <td className="px-5 py-4 font-semibold">{money(p.price)}{p.comparePrice > p.price && <span className="ml-1 text-xs font-normal text-slate-400 line-through">{money(p.comparePrice)}</span>}</td>
          <td className="px-5 py-4 text-slate-600">{p.costPrice != null ? money(p.costPrice) : <span className="text-xs text-slate-400">not set</span>}</td>
          <td className="px-5 py-4"><StockCell p={p} onSend={(body) => quick(p, body)}/></td>
          <td className="px-5 py-4 text-slate-600">{p.costPrice != null ? money(p.costPrice * p.stock) : "—"}</td>
          <td className="px-5 py-4"><div className="flex justify-end gap-1">
            <button title="Damaged, return or stock count" onClick={() => setAdjusting(p)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><SlidersHorizontal size={16}/></button>
            <button title="Stock history" onClick={() => setHistory(p)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><History size={16}/></button>
            <button title="Edit product" onClick={() => setEditing(p)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Edit3 size={16}/></button></div></td></tr>)}</tbody></table></div></div>}
    <Pager pagination={pagination} onPage={setPage}/>
    {importing && <ImportModal token={token} tell={tell} close={() => setImporting(false)} done={changed}/>}
    {editing && <ProductModal key={editing._id} owner product={editing} token={token} tell={tell} save={save} close={() => setEditing(null)}/>}
    {history && <HistoryModal product={history} token={token} tell={tell} close={() => setHistory(null)}/>}
    {adjusting && <AdjustModal product={adjusting} onSend={async (body) => { if (await quick(adjusting, body)) setAdjusting(null); }} close={() => setAdjusting(null)}/>}
  </section>;
}

function StockCell({ p, onSend }) {
  const [val, setVal] = useState(String(p.stock));
  useEffect(() => setVal(String(p.stock)), [p.stock]);
  const commit = () => { const n = Number(val); if (val.trim() === "" || !Number.isInteger(n) || n < 0 || n === p.stock) { setVal(String(p.stock)); return; } onSend({ set: n }); };
  return <div className="flex items-center gap-1">
    <button type="button" className="qty" aria-label="One less" disabled={p.stock <= 0} onClick={() => onSend({ delta: -1 })}><Minus size={14}/></button>
    <input className={cx("input w-16 px-2 py-1 text-center", p.stock === 0 && "border-red-300 bg-red-50")} inputMode="numeric" aria-label="Stock" value={val} onChange={(e) => setVal(e.target.value.replace(/\D/g, ""))} onBlur={commit} onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}/>
    <button type="button" className="qty" aria-label="One more" onClick={() => onSend({ delta: 1 })}><Plus size={14}/></button></div>;
}

/* ----------------------------------------------------- adjust with reason */
function AdjustModal({ product, onSend, close }) {
  const [mode, setMode] = useState("damage");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const n = Number(qty);
  const valid = qty !== "" && Number.isInteger(n) && (mode === "count" ? n >= 0 : n >= 1);
  const go = async (e) => {
    e.preventDefault(); if (!valid) return; setBusy(true);
    await onSend(mode === "count" ? { set: n, note } : { delta: mode === "damage" ? -n : n, reason: mode, note });
    setBusy(false);
  };
  const modes = [["damage", "Damaged / lost / expired", "Removes this many"], ["return", "Customer return", "Adds this many"], ["count", "Stock count", "Sets the exact number you counted"]];
  return <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/50 p-4"><form onSubmit={go} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
    <div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-extrabold">Change stock</h2><p className="mt-1 text-sm text-slate-500">{product.name} · now {product.stock}</p></div><button type="button" onClick={close} aria-label="Close"><X/></button></div>
    <div className="mt-4 space-y-2">{modes.map(([k, label, hint]) => <label key={k} className={cx("flex cursor-pointer items-start gap-3 rounded-xl border p-3", mode === k ? "border-ink bg-slate-50" : "border-slate-200")}><input type="radio" name="mode" className="mt-1" checked={mode === k} onChange={() => setMode(k)}/><span><span className="block text-sm font-bold">{label}</span><span className="block text-xs text-slate-500">{hint}</span></span></label>)}</div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2"><div><label className="label">{mode === "count" ? "Counted" : "How many"}</label><input className="input w-full" inputMode="numeric" autoFocus value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, ""))}/></div>
      <div><label className="label">Note (optional)</label><input className="input w-full" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)}/></div></div>
    <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={close} className="btn-secondary">Cancel</button><button disabled={!valid || busy} className="btn-primary">{busy ? "Saving..." : "Save"}</button></div></form></div>;
}

/* --------------------------------------------------------------- history */
function HistoryModal({ product, token, tell, close }) {
  const [page, setPage] = useState(1);
  const { data, pagination, loading } = useList("/api/shop/inventory/movements", { product: product._id, page, limit: 15 }, token, tell);
  return <div className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-slate-950/50 p-4"><div className="my-8 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
    <div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-extrabold">Stock history</h2><p className="mt-1 text-sm text-slate-500">{product.name}</p></div><button onClick={close} aria-label="Close"><X/></button></div>
    <div className="mt-4">{loading ? <Loading/> : !data.length ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No changes recorded yet. From now on every sale, restock and adjustment shows up here.</p> :
      <ul className="divide-y divide-slate-100">{data.map((m) => <li key={m._id} className="flex items-center justify-between gap-3 py-3 text-sm">
        <div className="min-w-0"><p className="font-semibold">{REASONS[m.reason] || m.reason}</p><p className="truncate text-xs text-slate-500">{when(m.createdAt)}{m.by?.name ? ` · ${m.by.name}` : ""}{m.note ? ` · ${m.note}` : ""}{m.costPrice != null ? ` · cost ${money(m.costPrice)}` : ""}</p></div>
        <span className={cx("shrink-0 font-extrabold", m.delta > 0 ? "text-emerald-700" : "text-red-600")}>{m.delta > 0 ? "+" : ""}{m.delta}</span></li>)}</ul>}</div>
    <Pager pagination={pagination} onPage={setPage}/>
  </div></div>;
}


/* ---------------------------------------------------------------- CSV import */
const ACTION = { create: ["New", "bg-emerald-100 text-emerald-700"], update: ["Update", "bg-indigo-100 text-indigo-700"], error: ["Problem", "bg-red-100 text-red-700"] };

function ImportModal({ token, tell, close, done }) {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const pick = async (e) => {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    if (f.size > 900_000) return tell("That file is too big (max about 900 KB, roughly 2,000 products). Split it into smaller files.", "error");
    const t = await f.text();
    setText(t); setFileName(f.name); setResult(null); setPreview(null);
    run(t, true);
  };
  const run = async (csv, dryRun) => {
    setBusy(true);
    try {
      const r = await api("/api/shop/inventory/import", { token: await token(), method: "POST", body: { csv, dryRun } });
      if (dryRun) setPreview(r); else { setResult(r); setPreview(null); await done(); }
    } catch (e) { tell(e.message, "error"); setPreview(null); } finally { setBusy(false); }
  };
  const s = preview?.summary;
  const nothing = s && s.create + s.update === 0;
  return <Modal title="Import products from CSV" subtitle="Update prices and stock for many products at once, or add new ones. Matches by barcode, then SKU, then exact name." close={close} wide>
    {result ? <div>
      <p className="rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{result.message}</p>
      {result.failures?.length > 0 && <ul className="mt-3 space-y-1 text-sm text-red-700">{result.failures.map((f) => <li key={f.line}>Row {f.line}{f.name ? ` (${f.name})` : ""}: {f.error}</li>)}</ul>}
      <button onClick={close} className="btn-primary mt-5 w-full">Done</button>
    </div> : <>
      <div className="flex flex-wrap items-center gap-2">
        <label className="btn-primary cursor-pointer"><Upload size={16}/> Choose CSV file<input type="file" accept=".csv,text/csv,text/plain" className="sr-only" onChange={pick}/></label>
        <button type="button" className="btn-secondary" onClick={async () => { try { await download("/api/shop/inventory/template.csv", await token(), "stock-template.csv"); } catch (e) { tell(e.message, "error"); } }}><Download size={16}/> Template</button>
        {fileName && <span className="truncate text-xs text-slate-500">{fileName}</span>}
      </div>
      <p className="mt-3 text-xs text-slate-500">Tip: press <b>Export</b>, edit the file in Excel or Google Sheets, then import it back. Columns left empty are not changed. <b>Stock is set to the number in the file.</b> New products start hidden until you add a photo.</p>
      {busy && !preview && <Loading/>}
      {preview && <div className="mt-5">
        <div className="flex flex-wrap gap-2 text-xs font-bold"><span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">{s.create} new</span><span className="rounded-full bg-indigo-100 px-3 py-1 text-indigo-700">{s.update} to update</span><span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">{s.unchanged} unchanged</span>{s.error > 0 && <span className="rounded-full bg-red-100 px-3 py-1 text-red-700">{s.error} with problems (skipped)</span>}</div>
        {preview.ignoredColumns?.length > 0 && <p className="mt-2 text-xs text-slate-400">Ignored columns: {preview.ignoredColumns.join(", ")}</p>}
        <div className="mt-3 max-h-72 overflow-y-auto rounded-xl border border-slate-200"><table className="w-full text-left text-xs"><tbody className="divide-y divide-slate-100">
          {preview.rows.map((r) => <tr key={r.line}><td className="w-14 px-3 py-2 text-slate-400">Row {r.line}</td><td className="w-20 px-3 py-2"><span className={cx("rounded-full px-2 py-0.5 font-bold", ACTION[r.action][1])}>{ACTION[r.action][0]}</span></td>
            <td className="px-3 py-2"><p className="font-semibold">{r.name}</p>{r.error && <p className="text-red-600">{r.error}</p>}{r.warning && <p className="text-amber-600">{r.warning}</p>}
              {r.changes && <p className="text-slate-500">{r.changes.map((c) => `${c.field}: ${c.from === "" ? "–" : c.from} → ${c.to}`).join(" · ")}</p>}
              {r.action === "create" && <p className="text-slate-500">₹{r.set.price} · stock {r.set.stock} · {r.set.category}</p>}</td></tr>)}
        </tbody></table></div>
        {preview.rows.length >= 300 && <p className="mt-1 text-xs text-slate-400">Showing the first 300 changes.</p>}
        <button disabled={busy || nothing} onClick={() => run(text, false)} className="btn-primary mt-4 w-full">{busy ? "Importing…" : nothing ? "Nothing to import" : `Apply ${s.create + s.update} change${s.create + s.update === 1 ? "" : "s"}`}</button>
      </div>}
    </>}
  </Modal>;
}
