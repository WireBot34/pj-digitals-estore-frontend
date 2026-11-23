import React, { useState } from "react";
import { money } from "./api";
import { cx } from "./ui";

/** A tidy top value for the y axis: 1, 2, 2.5, 5 or 10 times a power of ten. */
export function niceMax(v) {
  if (!(v > 0)) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
}
const short = (n) => (n >= 1e7 ? `${+(n / 1e7).toFixed(1)}Cr` : n >= 1e5 ? `${+(n / 1e5).toFixed(1)}L` : n >= 1e3 ? `${+(n / 1e3).toFixed(1)}k` : `${Math.round(n)}`);
const dayLabel = (iso) => new Date(`${iso}T12:00:00+05:30`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

/** Sales per day as a line with a soft fill. Hover or use arrow keys to read a day. data = [{date, sales, orders}] */
export function SalesChart({ data }) {
  const [hot, setHot] = useState(null);
  const W = 640, H = 220, L = 44, R = 12, T = 12, B = 26;
  const top = niceMax(Math.max(...data.map((d) => d.sales), 0));
  const n = data.length;
  const x = (i) => L + (n <= 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (n - 1));
  const y = (v) => T + (H - T - B) * (1 - v / top);
  const pts = data.map((d, i) => `${x(i).toFixed(1)},${y(d.sales).toFixed(1)}`);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * top);
  const labelIdx = n <= 7 ? data.map((_, i) => i) : [0, Math.round((n - 1) / 3), Math.round(((n - 1) * 2) / 3), n - 1];
  const total = data.reduce((s, d) => s + d.sales, 0);
  const move = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    setHot(Math.max(0, Math.min(n - 1, Math.round(((px - L) / (W - L - R)) * (n - 1)))));
  };
  const d = hot != null ? data[hot] : null;
  return <div className="relative">
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full touch-pan-y" role="img" aria-label={`Daily sales over ${n} days, ${money(total)} in total`}
      tabIndex={0} onPointerMove={move} onPointerDown={move} onPointerLeave={() => setHot(null)} onBlur={() => setHot(null)}
      onKeyDown={(e) => { if (e.key === "ArrowLeft") setHot((h) => Math.max(0, (h ?? n) - 1)); else if (e.key === "ArrowRight") setHot((h) => Math.min(n - 1, (h ?? -1) + 1)); else if (e.key === "Escape") setHot(null); }}>
      {ticks.map((t) => <g key={t}><line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="stroke-slate-200" strokeWidth="1"/><text x={L - 6} y={y(t) + 4} textAnchor="end" className="fill-slate-400" fontSize="11">{short(t)}</text></g>)}
      {n > 0 && <>
        <polygon points={`${x(0)},${y(0)} ${pts.join(" ")} ${x(n - 1)},${y(0)}`} className="fill-indigo-500/10"/>
        <polyline points={pts.join(" ")} fill="none" className="stroke-indigo-500" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
      </>}
      {labelIdx.map((i) => <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} className="fill-slate-400" fontSize="11">{dayLabel(data[i].date)}</text>)}
      {hot != null && <g><line x1={x(hot)} x2={x(hot)} y1={T} y2={H - B} className="stroke-slate-300" strokeDasharray="3 3"/><circle cx={x(hot)} cy={y(data[hot].sales)} r="4.5" className="fill-white stroke-indigo-600" strokeWidth="2.5"/></g>}
    </svg>
    <div className="mt-1 min-h-[1.5rem] text-sm" aria-live="polite">
      {d ? <><b>{dayLabel(d.date)}</b> · {money(d.sales)} · {d.orders} order{d.orders === 1 ? "" : "s"}</> : <span className="text-slate-400">Touch or hover the chart to see a day</span>}
    </div>
  </div>;
}

/** Horizontal bars: rows = [{label, value, note}] */
export function Bars({ rows, tone = "bg-indigo-500" }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return <div className="space-y-3">{rows.map((r) => <div key={r.label}>
    <div className="flex justify-between gap-3 text-sm"><span className="truncate font-semibold">{r.label}</span><span className="shrink-0 text-slate-500">{r.note}</span></div>
    <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"><div className={cx("h-full rounded-full", tone)} style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }}/></div>
  </div>)}</div>;
}

/** "▲ 12% vs previous 30 days" (or ▼). Nothing to compare with -> nothing shown. */
export function Delta({ now, before, days }) {
  if (!before) return now > 0 ? <span className="text-xs font-semibold text-slate-400">New: nothing to compare with yet</span> : null;
  const pct = Math.round(((now - before) / before) * 100);
  const up = pct >= 0;
  return <span className={cx("text-xs font-bold", up ? "text-emerald-600" : "text-red-600")}>{up ? "▲" : "▼"} {Math.abs(pct)}% <span className="font-medium text-slate-400">vs previous {days} days</span></span>;
}
