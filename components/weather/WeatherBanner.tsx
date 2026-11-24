"use client";

// Contextgevoelige weerbanner — alleen bij relevante omstandigheden, één keer per dag weg te klikken.

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useT } from "@/lib/i18n-context";
import { IconButton } from "@/components/ui/IconButton";
import type { CurrentWeather } from "@/lib/weather";

interface Props {
  current:         CurrentWeather | null;
  scoreThreshold?: number;
}

type Banner = { key: string; tone: "info" | "warning" | "success" | "primary" };

// Volledige klassenamen, zodat Tailwind ze vindt
const TONE: Record<Banner["tone"], { bar: string; text: string }> = {
  info:    { bar: "bg-info",    text: "text-ink" },
  warning: { bar: "bg-warning", text: "text-ink" },
  success: { bar: "bg-success", text: "text-success" },
  primary: { bar: "bg-primary", text: "text-ink" },
};

function resolveBanner(current: CurrentWeather, threshold?: number): Banner | null {
  if (current.precipitation > 3)  return { key: "banner_rain", tone: "info" };
  if (current.windspeed > 35)     return { key: "banner_wind", tone: "warning" };
  if (current.temperature < 5)    return { key: "banner_cold", tone: "info" };
  if (current.cyclingScore > 85)  return { key: "banner_perfect", tone: "success" };
  if (threshold != null && current.cyclingScore < threshold) return { key: "banner_moderate", tone: "primary" };
  return null;
}

function todayKey(): string {
  return `tulipday_weather_banner_${new Date().toISOString().slice(0, 10)}`;
}

export default function WeatherBanner({ current, scoreThreshold }: Props) {
  const { t } = useT();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(todayKey()) === "dismissed") setDismissed(true);
    } catch { /* geen localStorage */ }
  }, []);

  function dismiss() {
    try { localStorage.setItem(todayKey(), "dismissed"); } catch { /* geen localStorage */ }
    setDismissed(true);
  }

  const banner = current && !dismissed ? resolveBanner(current, scoreThreshold) : null;

  return (
    <AnimatePresence>
      {banner && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22 }}
          className="relative mx-4 mt-3 flex items-center justify-between overflow-hidden rounded-xl border border-line bg-surface-2 py-1 pl-4 pr-1"
          role="status"
        >
          <span aria-hidden className={`absolute inset-y-0 left-0 w-1 ${TONE[banner.tone].bar}`} />
          <p className={`flex-1 text-label leading-snug ${TONE[banner.tone].text}`}>{t(`weather.${banner.key}`)}</p>
          <IconButton variant="ghost" aria-label={t("common.close")} onClick={dismiss}>
            <X size={14} />
          </IconButton>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
