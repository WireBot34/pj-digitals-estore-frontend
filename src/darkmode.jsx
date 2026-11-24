import React, { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

const KEY = "pj_appearance"; // "system" | "light" | "dark"
const ORDER = ["system", "light", "dark"];
const LABEL = { system: "Match my device", light: "Light", dark: "Dark" };

export const readPref = () => {
  try { const v = localStorage.getItem(KEY); return ORDER.includes(v) ? v : "system"; } catch { return "system"; }
};
export const isDark = (pref, prefersDark) => pref === "dark" || (pref === "system" && !!prefersDark);

/** Puts the "dark" class on <html> and keeps the browser's address-bar colour in step. */
export function applyAppearance(pref = readPref()) {
  const dark = isDark(pref, typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#14130f" : "#f6f4ef");
  return dark;
}

/** One button that cycles Match my device -> Light -> Dark. */
export function ThemeToggle({ className = "" }) {
  const [pref, setPref] = useState(readPref);
  useEffect(() => {
    applyAppearance(pref);
    if (typeof matchMedia !== "function") return undefined;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const on = () => pref === "system" && applyAppearance("system"); // follow the device while on "match"
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, [pref]);
  const next = () => {
    const n = ORDER[(ORDER.indexOf(pref) + 1) % ORDER.length];
    try { localStorage.setItem(KEY, n); } catch { /* private mode: still works for this visit */ }
    setPref(n);
  };
  const Icon = pref === "dark" ? Moon : pref === "light" ? Sun : Monitor;
  return <button type="button" onClick={next} title={`Appearance: ${LABEL[pref]}`} aria-label={`Appearance: ${LABEL[pref]}. Press to change.`}
    className={`grid h-10 w-10 place-items-center rounded-lg text-slate-700 hover:bg-slate-200/60 ${className}`}><Icon size={19}/></button>;
}
