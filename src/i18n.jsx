import React from "react";
import { DICTS, KEY, readLang, translate } from "./i18n.core";
export { readLang, translate };

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "CODE", "PRE", "TEXTAREA", "INPUT", "NOSCRIPT", "SVG", "OPTION"]);
const ATTRS = ["placeholder", "title", "aria-label"];

const optedOut = (el) => {
  for (let e = el; e && e.nodeType === 1; e = e.parentElement) if (e.getAttribute?.("translate") === "no" || e.isContentEditable) return true;
  return false;
};
// text we must leave alone: code, form fields, and an <option> without its own value (its text IS the value that gets saved)
const skipped = (el) => {
  for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
    if (SKIP_TAGS.has(e.tagName.toUpperCase())) {
      if (e.tagName === "OPTION" && e.hasAttribute("value")) continue;
      return true;
    }
  }
  return optedOut(el);
};

const done = new WeakMap(); // element -> { nodes, orig, wrote }: what its text nodes said in English, and what we wrote over them

/** Sets text nodes to translations, remembering the English so a later change by React can be translated again. */
const write = (el, nodes, english, values) => {
  nodes.forEach((n, i) => { n.nodeValue = values[i]; });
  done.set(el, { nodes, orig: english, wrote: values });
};

/**
 * Translates one element's own text, then its attributes.
 * "We deliver in {places}." arrives as several text nodes, so an all-text element is translated as one sentence
 * (keeps the word order right). When React later changes one of those nodes (a stock count, say), the English is
 * rebuilt from what we remembered plus the new value, and translated again.
 */
function fixElement(el, lang) {
  if (optedOut(el)) return;
  const kids = skipped(el) ? [] : [...el.childNodes].filter((n) => n.nodeType === 3);
  const allText = kids.length > 0 && kids.length === el.childNodes.length;
  if (kids.length) {
    const prev = done.get(el);
    const same = prev && prev.nodes.length === kids.length && prev.nodes.every((n, i) => n === kids[i]);
    const english = kids.map((n, i) => (same && n.nodeValue === prev.wrote[i] ? prev.orig[i] : n.nodeValue));
    if (allText) {
      const whole = translate(english.join(""), lang);
      if (whole !== null) write(el, kids, english, kids.map((_, i) => (i === 0 ? whole : "")));
      else if (kids.length > 1) {
        const each = english.map((t) => translate(t, lang));
        if (each.some((t) => t !== null)) write(el, kids, english, each.map((t, i) => t ?? english[i]));
      }
    } else {
      // mixed content (text beside icons or <b>): each text piece on its own
      const each = english.map((t) => translate(t, lang));
      if (each.some((t) => t !== null)) write(el, kids, english, each.map((t, i) => t ?? english[i]));
    }
  }
  for (const a of ATTRS) { const v = el.getAttribute?.(a); if (v) { const t = translate(v, lang); if (t !== null) el.setAttribute(a, t); } }
}

function fixTree(root, lang) {
  if (root.nodeType === 3) { if (root.parentElement) fixElement(root.parentElement, lang); return; }
  if (root.nodeType !== 1) return;
  fixElement(root, lang);
  root.querySelectorAll?.("*").forEach((el) => fixElement(el, lang));
}

let observer = null;

/**
 * Switches the storefront text to Malayalam as React draws it. No page needed changing: text that
 * matches a line in i18n.ml.js is replaced, everything else stays English. Changing language reloads the page.
 */
export function startTranslator(lang = readLang(), root = document.body) {
  document.documentElement.lang = lang;
  if (lang === "en" || !DICTS[lang]) return () => {};
  let queued = new Set();
  let timer = 0;
  const flush = () => { timer = 0; const items = [...queued]; queued = new Set(); items.forEach((n) => n.isConnected && fixTree(n, lang)); };
  const later = (n) => { queued.add(n); if (!timer) timer = requestAnimationFrame(flush); };
  observer = new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === "childList") m.addedNodes.forEach(later);
      else if (m.type === "characterData") later(m.target);
      else if (m.type === "attributes") later(m.target);
    }
  });
  observer.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  fixTree(root, lang);
  return () => { observer?.disconnect(); observer = null; if (timer) cancelAnimationFrame(timer); };
}

export function setLang(lang) {
  try { localStorage.setItem(KEY, lang); } catch { /* storage blocked */ }
  window.location.reload();
}

/** Header button: "മലയാളം" while in English, "English" while in Malayalam. */
export function LanguageToggle({ className = "" }) {
  const lang = readLang();
  const to = lang === "ml" ? "en" : "ml";
  return <button type="button" translate="no" onClick={() => setLang(to)} lang={to} aria-label={to === "ml" ? "മലയാളത്തിലേക്ക് മാറുക (Switch to Malayalam)" : "Switch to English"}
    className={`h-10 shrink-0 rounded-lg px-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200/60 ${className}`}>{to === "ml" ? "മലയാളം" : "English"}</button>;
}
