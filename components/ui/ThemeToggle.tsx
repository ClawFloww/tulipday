"use client";

// ThemeToggle — segmented control voor thema-keuze
// Drie opties: ☀️ Licht | 🌙 Donker | 📱 Systeem
// Framer Motion layout-animatie voor de glijdende indicator

import { motion } from "framer-motion";
import { useTheme, type Theme } from "@/hooks/useTheme";

const OPTIONS: { value: Theme; emoji: string; label: string }[] = [
  { value: "light",  emoji: "☀️", label: "Licht"   },
  { value: "dark",   emoji: "🌙", label: "Donker"  },
  { value: "system", emoji: "📱", label: "Systeem" },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className="rounded-xl p-1 flex gap-0.5"
      style={{ backgroundColor: "var(--color-surface-3)" }}
    >
      {OPTIONS.map((opt) => {
        const isActive = theme === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => setTheme(opt.value)}
            className="relative flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg
                       text-xs font-bold tap-scale"
            style={{ color: isActive ? "#ffffff" : "var(--color-text-2)" }}
            aria-pressed={isActive}
          >
            {/* Glijdende rode indicator */}
            {isActive && (
              <motion.div
                layoutId="theme-indicator"
                className="absolute inset-0 rounded-lg"
                style={{ backgroundColor: "var(--color-primary)" }}
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            <span className="relative z-10 text-sm leading-none">{opt.emoji}</span>
            <span className="relative z-10">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
