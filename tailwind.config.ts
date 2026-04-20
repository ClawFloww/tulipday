import type { Config } from "tailwindcss";

const config: Config = {
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
        tulip: {
          50:  "#FEF1F3",
          100: "#FDCFD4",
          200: "#F8B4BC",
          300: "#F47F8C",
          400: "#EF5060",
          500: "#E8334A",
          600: "#CC2A3E",
          700: "#A82233",
        },
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
        warm: "#FAFAF9",
        petal: "#F8B4BC",
        leaf:  "#D4E6C3",
      },
      fontFamily: {
        // Body font (standaard) — Inter
        sans:    ["var(--font-body)", "Inter", "system-ui", "sans-serif"],
        // Display font — Playfair Display voor titels, headers, hero-tekst
        display: ["var(--font-display)", "Playfair Display", "Georgia", "serif"],
        // Mono/stats font — Inter Tight voor getallen en statistieken
        mono:    ["var(--font-mono)", "Inter Tight", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "20px",
        "xl":  "12px",
      },
      boxShadow: {
        card:       "0 2px 12px 0 rgba(0,0,0,0.07)",
        "card-hover": "0 6px 24px 0 rgba(0,0,0,0.12)",
        // Subtiele schaduw voor de navigatiebalk (boven)
        nav:        "0 -1px 0 0 rgba(0,0,0,0.06)",
      },
    },
  },
  plugins: [],
};
export default config;
