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
        "on-primary": "var(--color-on-primary)",

        // ── Tekst & randen (semantisch, schakelen per thema) ──
        ink: {
          DEFAULT: "var(--color-text)",
          2:       "var(--color-text-2)",
          3:       "var(--color-text-3)",
        },
        line: {
          DEFAULT: "var(--color-border)",
          strong:  "var(--color-border-strong)",
        },
        overlay: "var(--color-overlay)",

        // ── Status ──
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        danger:  "var(--color-danger)",
        info:    "var(--color-info)",

        // ── Tulip-palet: warme roodtinten rond het merkrood (geen roze) ──
        tulip: {
          50:  "#FFF3F1",
          100: "#FFE2DE",
          200: "#FFC2BA",
          300: "#FF8F82",
          400: "#F5483A",
          500: "#E8102A",   // merkrood (primair)
          600: "#C40C22",   // hover / pressed
          700: "#9E0A1C",
          800: "#7A0815",
          900: "#4D050D",
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
        display: ["var(--font-display)", "Plus Jakarta Sans", "system-ui", "sans-serif"],
        // Cijfers: Inter met tabular-nums (zie .font-mono in globals.css)
        mono:    ["var(--font-body)",    "Inter",            "system-ui", "sans-serif"],
      },

      // ── Typografieschaal: [grootte, { regelhoogte, gewicht, letterafstand }] ──
      fontSize: {
        display:  ["28px", { lineHeight: "34px", fontWeight: "800", letterSpacing: "-0.02em" }],
        title:    ["22px", { lineHeight: "28px", fontWeight: "700", letterSpacing: "-0.01em" }],
        headline: ["17px", { lineHeight: "22px", fontWeight: "700" }],
        body:     ["15px", { lineHeight: "22px" }],
        label:    ["13px", { lineHeight: "18px", fontWeight: "600" }],
        caption:  ["11px", { lineHeight: "14px", fontWeight: "500" }],
      },

      borderRadius: {
        "2xl": "16px",
        "3xl": "20px",
        "xl":  "12px",
      },

      boxShadow: {
        sm:           "var(--shadow-sm)",
        md:           "var(--shadow-md)",
        lg:           "var(--shadow-lg)",
        sheet:        "var(--shadow-sheet)",
        card:         "var(--shadow-md)",
        "card-hover": "var(--shadow-lg)",
        nav:          "0 -1px 0 0 var(--color-border)",
      },

      // Minimale aanraakgrootte (Apple HIG / Material: 44px)
      minHeight: { touch: "44px" },
      minWidth:  { touch: "44px" },

      transitionDuration: {
        fast: "var(--duration-fast)",
        base: "var(--duration-base)",
        slow: "var(--duration-slow)",
      },
      transitionTimingFunction: {
        "out-soft": "var(--ease-out)",
      },
    },
  },
  plugins: [],
};

export default config;
