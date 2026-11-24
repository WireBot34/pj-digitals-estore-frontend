import { ML, ML_RULES } from "./i18n.ml.js";

export const KEY = "pj_lang"; // "en" | "ml"
export const DICTS = { ml: { words: ML, rules: ML_RULES } };

export const readLang = () => {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "en" || v === "ml") return v;
  } catch { /* storage blocked */ }
  return typeof navigator !== "undefined" && /^ml\b/i.test(navigator.language || "") ? "ml" : "en"; // a phone set to Malayalam gets Malayalam
};

/** Malayalam for one piece of text, or null when we have none. Whitespace around the text is kept. */
export function translate(text, lang = "ml", dict = DICTS[lang]) {
  if (!dict || !text) return null;
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(text);
  const core = m[2].replace(/\s+/g, " ");
  if (!/[A-Za-z]/.test(core)) return null;
  let out = dict.words[core];
  if (out === undefined) {
    for (const [re, fn] of dict.rules) {
      const r = re.exec(core);
      if (r) { out = fn(...r); break; }
    }
  }
  return out === undefined ? null : m[1] + out + m[3];
}

