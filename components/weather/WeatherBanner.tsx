"use client";

// Contextgevoelige weerbanner — toont alleen bij relevante omstandigheden

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { CurrentWeather } from "@/lib/weather";

interface Props {
  current:        CurrentWeather | null;
  scoreThreshold?: number; // Toon waarschuwing als score < threshold
}

interface BannerConfig {
  message:     string;
  bg:          string;
  text:        string;
  border:      string;
}

function resolveBanner(
  current: CurrentWeather,
  threshold?: number,
): BannerConfig | null {
  // Negatieve omstandigheden hebben prioriteit
  if (current.precipitation > 3) {
    return {
      message: "Regenachtig vandaag · Routes blijven beschikbaar",
      bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE",
    };
  }
  if (current.windspeed > 35) {
    return {
      message: "Stevige wind vandaag · Houd hier rekening mee",
      bg: "#FFFBEB", text: "#92400E", border: "#FDE68A",
    };
  }
  if (current.temperature < 5) {
    return {
      message: "Koud vandaag · Warm aantrekken",
      bg: "#EFF6FF", text: "#1E3A5F", border: "#BFDBFE",
    };
  }
  // Positief
  if (current.cyclingScore > 85) {
    return {
      message: "Perfecte dag voor een bollenroute! 🌷",
      bg: "#F0FDF4", text: "#14532D", border: "#BBF7D0",
    };
  }
  // Lage-score waarschuwing voor routes-pagina
  if (threshold != null && current.cyclingScore < threshold) {
    return {
      message: "Matig fietsweer vandaag · Controleer de route voor je vertrekt",
      bg: "#FFF7ED", text: "#7C2D12", border: "#FED7AA",
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
          <p className="text-xs font-semibold flex-1 leading-snug" style={{ color: config.text }}>
            {config.message}
          </p>
          <button
            onClick={dismiss}
            className="ml-3 flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
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
