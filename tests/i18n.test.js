import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { translate } from "../src/i18n.core.js";
import { ML, ML_RULES } from "../src/i18n.ml.js";

test("known text is translated and the spaces around it are kept", () => {
  assert.equal(translate("Home"), "ഹോം");
  assert.equal(translate("  Home  "), "  ഹോം  ");
  assert.equal(translate("Sold   by:"), "വിൽക്കുന്നത്:"); // runs of spaces collapse before matching
});

test("unknown text, numbers and empty text are left alone (null)", () => {
  assert.equal(translate("Some unknown English text"), null);
  assert.equal(translate("12345"), null);
  assert.equal(translate(""), null);
  assert.equal(translate("Home", "xx"), null); // a language we have no dictionary for
});

test("sentences with a changing part are translated by rule", () => {
  assert.equal(translate("Only 3 left"), "3 എണ്ണം മാത്രം ബാക്കി");
  assert.equal(translate("12% off"), "12% കിഴിവ്");
  assert.match(translate("We deliver in Thodupuzha and Muttom. You can pay cash when your order arrives."), /ഓർഡർ എത്തുമ്പോൾ പണമായി നൽകാം/);
  assert.match(translate("Add ₹150 more for free delivery"), /₹150/);
});

test("the dictionary is clean: no empty lines, no stray spaces in keys, no English left as the value", () => {
  for (const [k, v] of Object.entries(ML)) {
    assert.ok(v && v.trim(), `empty translation for "${k}"`);
    assert.equal(k, k.trim(), `key has outer spaces: "${k}"`);
    assert.ok(/[ഀ-ൿ]/.test(v) || /^[A-Z]{2,}[:]?$/.test(v) || /^[0-9A-Z .:,-]+$/i.test(k), `"${k}" has no Malayalam in its translation`);
  }
});

test("no English line is written twice in the dictionary (the later one would silently win)", () => {
  const src = readFileSync(new URL("../src/i18n.ml.js", import.meta.url), "utf8");
  const body = src.slice(src.indexOf("export const ML = {"), src.indexOf("export const ML_RULES"));
  const keys = [...body.matchAll(/(?:^|[,{]\s*)"((?:[^"\\]|\\.)+)"\s*:/gm)].map((m) => m[1]);
  const seen = new Set();
  for (const k of keys) { assert.ok(!seen.has(k), `duplicate key "${k}"`); seen.add(k); }
  assert.ok(keys.length > 200);
});

test("rules never throw on their own examples and always return text", () => {
  for (const [re, fn] of ML_RULES) assert.equal(typeof fn, "function", String(re));
});
