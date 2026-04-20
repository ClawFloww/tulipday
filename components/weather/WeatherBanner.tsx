"use client";

// Contextgevoelige weerbanner — toont alleen bij relevante omstandigheden
// Kleuren gebruiken rgba-transparantie zodat ze werken in licht én donker thema

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { CurrentWeather } from "@/lib/weather";

interface Props {
  current:         CurrentWeather | null;
  scoreThreshold?: number;
}

interface BannerConfig {
  message: string;
  bg:      string;
  text:    string;
  border:  string;
}

function resolveBanner(current: CurrentWeather, threshold?: number): BannerConfig | null {
  if (current.precipitation > 3) {
    return {
      message: "Regenachtig vandaag · Routes blijven beschikbaar",
      bg:     "rgba(59, 130, 246, 0.10)",
      text:   "var(--color-text)",
      border: "rgba(59, 130, 246, 0.25)",
    };
  }
  if (current.windspeed > 35) {
    return {
      message: "Stevige wind vandaag · Houd hier rekening mee",
      bg:     "rgba(245, 158, 11, 0.10)",
      text:   "var(--color-text)",
      border: "rgba(245, 158, 11, 0.25)",
    };
  }
  if (current.temperature < 5) {
    return {
      message: "Koud vandaag · Warm aantrekken",
      bg:     "rgba(99, 179, 237, 0.10)",
      text:   "var(--color-text)",
      border: "rgba(99, 179, 237, 0.25)",
    };
  }
  if (current.cyclingScore > 85) {
    return {
      message: "Perfecte dag voor een bollenroute! 🌷",
      bg:     "rgba(45, 125, 70, 0.10)",
      text:   "var(--color-score-good)",
      border: "rgba(45, 125, 70, 0.25)",
    };
  }
  if (threshold != null && current.cyclingScore < threshold) {
    return {
      message: "Matig fietsweer vandaag · Controleer de route voor je vertrekt",
      bg:     "rgba(232, 16, 42, 0.08)",
      text:   "var(--color-text)",
      border: "rgba(232, 16, 42, 0.20)",
    };
  }
  return null;
}

function todayKey(): string {
  return `tulipday_weather_banner_${new Date().toISOString().slice(0, 10)}`;
}

export default function WeatherBanner({ current, scoreThreshold }: Props) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(todayKey()) === "dismissed") setDismissed(true);
    } catch { /* geen localStorage */ }
  }, []);

  function dismiss() {
    try { localStorage.setItem(todayKey(), "dismissed"); } catch {}
    setDismissed(true);
  }

  const config = current && !dismissed ? resolveBanner(current, scoreThreshold) : null;

  return (
    <AnimatePresence>
      {config && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22 }}
          className="mx-4 mt-3 rounded-xl flex items-center justify-between px-4 py-3 border"
          style={{ backgroundColor: config.bg, borderColor: config.border }}
        >
          <p className="text-xs font-semibold flex-1 leading-snug"
             style={{ color: config.text }}>
            {config.message}
          </p>
          <button
            onClick={dismiss}
            className="ml-3 flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity tap-scale"
            style={{ color: config.text }}
            aria-label="Sluit melding"
          >
            <X size={14} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
