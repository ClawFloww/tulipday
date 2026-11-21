"use client";

// ThemeToggle — segmented control voor thema-keuze: Licht | Donker | Systeem
// Framer Motion layout-animatie voor de glijdende indicator

import { motion } from "framer-motion";
import { Moon, Smartphone, Sun, type LucideIcon } from "lucide-react";
import { tap } from "@/lib/haptics";
import { useT } from "@/lib/i18n-context";
import { useTheme, type Theme } from "@/hooks/useTheme";

const OPTIONS: { value: Theme; Icon: LucideIcon; labelKey: string }[] = [
  { value: "light",  Icon: Sun,        labelKey: "settings.theme_light"  },
  { value: "dark",   Icon: Moon,       labelKey: "settings.theme_dark"   },
  { value: "system", Icon: Smartphone, labelKey: "settings.theme_system" },
];

export function ThemeToggle() {
  const { t } = useT();
  const { theme, setTheme } = useTheme();

  return (
    <div role="radiogroup" aria-label={t("settings.theme_title")} className="rounded-xl p-1 flex gap-0.5 bg-surface-3">
      {OPTIONS.map(({ value, Icon, labelKey }) => {
        const isActive = theme === value;
        return (
          <button
            key={value}
            role="radio"
            aria-checked={isActive}
            onClick={() => { if (!isActive) tap(); setTheme(value); }}
            className={`relative flex-1 flex items-center justify-center gap-1.5 min-h-touch rounded-lg text-label
                        transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
                        ${isActive ? "text-on-primary" : "text-ink-2"}`}
          >
            {/* Glijdende rode indicator */}
            {isActive && (
              <motion.span
                layoutId="theme-indicator"
                className="absolute inset-0 rounded-lg bg-primary shadow-sm"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            <Icon size={15} className="relative z-10" aria-hidden />
            <span className="relative z-10">{t(labelKey)}</span>
          </button>
        );
      })}
    </div>
  );
}
