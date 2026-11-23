/**
 * Seasonal colour themes, picked from the date. No server needed.
 * Dates are MM-DD. Festivals that move every year (Onam, Diwali, Eid...) are listed with
 * approximate windows: edit them once a year. Preview any theme with  ?theme=onam  in the address bar
 * (use ?theme=off to switch back).
 */

// lightness steps shared by every scale: 50 100 200 ... 900 950
const STEPS = [[50, 96], [100, 91], [200, 83], [300, 71], [400, 57], [500, 44], [600, 36], [700, 29], [800, 23], [900, 19], [950, 11]];

function hslToRgb(h, s, l) {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(255 * f(0)), Math.round(255 * f(8)), Math.round(255 * f(4))];
}

const luminance = ([r, g, b]) => {
  const c = [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const whiteContrast = (rgb) => 1.05 / (luminance(rgb) + 0.05);

/**
 * Builds a full 50..950 scale from one hue, as space separated "r g b" strings.
 * Yellows and oranges look light at the same lightness as greens, so the dark half of the scale
 * is pushed down until white text on the 600 shade (buttons) reaches a contrast of 4.6.
 */
export const scaleFor = (hue, sat = 55) => {
  let shift = 0;
  while (shift < 24 && whiteContrast(hslToRgb(hue, sat, 36 - shift)) < 4.6) shift += 1;
  return Object.fromEntries(STEPS.map(([step, light]) => [step, hslToRgb(hue, step >= 700 ? sat - 8 : sat, step >= 500 ? Math.max(6, light - shift) : light).join(" ")]));
};

export const SEASONS = [
  { id: "vishu", label: "Vishu", from: "04-08", to: "04-15", hue: 42, sat: 70, greeting: "Happy Vishu!" },
  { id: "onam", label: "Onam", from: "08-18", to: "09-06", hue: 36, sat: 72, greeting: "Happy Onam!" },
  { id: "diwali", label: "Diwali", from: "10-28", to: "11-13", hue: 18, sat: 72, greeting: "Happy Diwali!" },
  { id: "christmas", label: "Christmas", from: "12-10", to: "12-31", hue: 355, sat: 58, greeting: "Merry Christmas!" },
  { id: "newyear", label: "New Year", from: "01-01", to: "01-03", hue: 215, sat: 55, greeting: "Happy New Year!" },
];

const pad = (n) => String(n).padStart(2, "0");
const mmdd = (d) => `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const ymd = (d) => `${d.getFullYear()}-${mmdd(d)}`;
const within = (day, from, to) => (from <= to ? day >= from && day <= to : day >= from || day <= to);
/** from/to can be "MM-DD" (every year) or "YYYY-MM-DD" (that year only, set by an admin). */
const inWindow = (now, from, to) => (from.length === 10 && to.length === 10 ? ymd(now) >= from && ymd(now) <= to : within(mmdd(now), from.slice(-5), to.slice(-5)));

/**
 * The season that applies today, or null for the normal green. Order of priority:
 *   1. ?theme=  in the address bar (a private preview for this tab)
 *   2. the admin's choice from the server: "off", or one season forced on
 *   3. automatic by date, using the admin's festival dates where set and the built-in dates otherwise
 * server = { override: "auto" | "off" | seasonId, dates: { seasonId: [from, to] } }
 */
export function currentSeason(now = new Date(), forced = null, server = null) {
  const pick = (id) => (id === "off" ? null : SEASONS.find((s) => s.id === id) || null);
  if (forced) return pick(forced);
  const mode = server?.override || "auto";
  if (mode !== "auto") return pick(mode);
  const dates = server?.dates || {};
  return SEASONS.find((s) => {
    const d = dates[s.id];
    const [from, to] = Array.isArray(d) && d[0] && d[1] ? d : [s.from, s.to];
    return inWindow(now, from, to);
  }) || null;
}

const DEFAULT_SCALE = null; // the default green lives in index.css

/** Reads ?theme=, remembers it for the tab, applies the CSS variables and returns the season. */
export function applyTheme(server = null) {
  let forced = null;
  try {
    const q = new URLSearchParams(window.location.search).get("theme");
    if (q) sessionStorage.setItem("pj_theme", q);
    forced = sessionStorage.getItem("pj_theme");
  } catch { /* storage can be blocked */ }
  const season = currentSeason(new Date(), forced, server);
  const root = document.documentElement;
  const scale = season ? scaleFor(season.hue, season.sat) : DEFAULT_SCALE;
  STEPS.forEach(([step]) => {
    if (scale) root.style.setProperty(`--brand-${step}`, scale[step]);
    else root.style.removeProperty(`--brand-${step}`);
  });
  return season;
}
