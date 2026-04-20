import type { Config } from "tailwindcss";

const config: Config = {
  // Donkere modus via .dark klasse op <html>
  darkMode: "class",

  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],

  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",

        // ── Semantische oppervlak-tokens (schakelen automatisch per thema) ──
        surface:     "var(--color-surface)",
        "surface-2": "var(--color-surface-2)",
        "surface-3": "var(--color-surface-3)",

        // ── Primaire merkkleur — schakelt licht/donker via CSS var ──
        primary: {
          DEFAULT: "var(--color-primary)",
          dark:    "var(--color-primary-dark)",
          light:   "var(--color-primary-light)",
          subtle:  "var(--color-primary-subtle)",
        },

        // ── Tulip-palet: bijgewerkt naar nieuw merkrood ──
        tulip: {
          50:  "#FFF0F2",   // subtiele roze achtergrond
          100: "#FFD0D6",
          200: "#FF9EAA",
          300: "#FF6070",
          400: "#FF3347",   // licht rood / highlight
          500: "#E8102A",   // merkrood (primair)
          600: "#C00D22",   // hover / pressed
          700: "#9A0018",   // donker rood
        },

        // ── Groen (ongewijzigd) ──
        forest: {
          50:  "#EBF5EF",
          100: "#D4E6C3",
          200: "#B8DBA0",
          300: "#8EC87A",
          400: "#5FAD5B",
          500: "#2D6A4F",
          600: "#245640",
          700: "#1B4031",
        },

        // ── Paginaachtergrond (schakelt per thema) ──
        warm:  "var(--color-surface)",   // was: "#FAFAF9"

        petal: "#F8B4BC",
        leaf:  "#D4E6C3",
      },

      fontFamily: {
        sans:    ["var(--font-body)",    "Inter",            "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Playfair Display", "Georgia",   "serif"    ],
        mono:    ["var(--font-mono)",    "Inter Tight",      "system-ui", "sans-serif"],
      },

      borderRadius: {
        "2xl": "16px",
        "3xl": "20px",
        "xl":  "12px",
      },

      boxShadow: {
        card:         "0 2px 12px 0 rgba(0,0,0,0.07)",
        "card-hover": "0 6px 24px 0 rgba(0,0,0,0.12)",
        nav:          "0 -1px 0 0 rgba(0,0,0,0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
