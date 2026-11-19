import colors from "tailwindcss/colors";

/**
 * Design tokens.
 * The code base is written with Tailwind's `slate` and `indigo` utilities, so the whole look
 * is changed here: `slate` becomes a warm stone neutral, `indigo` becomes the brand green,
 * and corners are tightened. No page needs to know the palette changed.
 */
// Channels live in CSS variables (see :root in src/index.css) so src/theme.js can retint the whole site by season.
const brand = Object.fromEntries([50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((k) => [k, `rgb(var(--brand-${k}) / <alpha-value>)`]));

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: { slate: colors.stone, indigo: brand, violet: brand, brand, paper: "#f6f4ef", ink: "#1c1b18" },
      fontFamily: {
        sans: ['"Hanken Grotesk"', "system-ui", "sans-serif"],
        display: ['"Bricolage Grotesque"', '"Hanken Grotesk"', "system-ui", "sans-serif"],
      },
      borderRadius: { DEFAULT: "4px", md: "5px", lg: "6px", xl: "8px", "2xl": "10px", "3xl": "12px" },
      boxShadow: {
        sm: "0 1px 0 rgb(28 27 24 / .04)",
        DEFAULT: "0 1px 2px rgb(28 27 24 / .06)",
        lg: "0 6px 18px -8px rgb(28 27 24 / .18)",
        xl: "0 10px 28px -12px rgb(28 27 24 / .22)",
        "2xl": "0 18px 40px -16px rgb(28 27 24 / .28)",
      },
    },
  },
  plugins: [],
};
