"use client";

// Grote weerskaart met geanimeerde fietsweer-score ring en locatie-indicatie

import { motion } from "framer-motion";
import { Wind, Thermometer, RefreshCw, Droplets, MapPin } from "lucide-react";
import { useT } from "@/lib/i18n-context";
import { scoreBand, scoreColor, weatherCondition, windDirectionLabel } from "@/lib/weather";
import { IconButton } from "@/components/ui/IconButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { WeatherIcon } from "@/components/weather/WeatherIcon";
import type { CurrentWeather } from "@/lib/weather";

// SVG-ring parameters
const R    = 48;
const CIRC = 2 * Math.PI * R; // ≈ 301.6

interface Props {
  current:          CurrentWeather | null;
  isLoading:        boolean;
  error:            string | null;
  lastUpdated:      Date | null;
  onRefresh:        () => void;
  isUsingGPS?:      boolean;
  onLocationClick?: () => void;
}

export default function WeatherCard({
  current,
  isLoading,
  error,
  lastUpdated,
  onRefresh,
  isUsingGPS = false,
  onLocationClick,
}: Props) {
  const { t, locale } = useT();
  const place = t(isUsingGPS ? "weather.near_you" : "weather.in_lisse");
  const time  = lastUpdated?.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });

  if (isLoading && !current) {
    return (
      <div className="mx-4 rounded-2xl bg-surface-2 p-5 shadow-card" aria-busy="true">
        <div className="flex items-center gap-5">
          <Skeleton variant="circle" className="h-24 w-24 flex-shrink-0" />
          <div className="flex-1"><Skeleton variant="text" lines={4} /></div>
        </div>
      </div>
    );
  }

  if (error && !current) {
    return (
      <div className="mx-4 flex items-center justify-between rounded-2xl border border-line bg-surface-2 p-4" role="alert">
        <div>
          <p className="text-label text-ink">{t("weather.unavailable")}</p>
          <p className="mt-0.5 text-caption text-ink-3">{t("weather.check_connection")}</p>
        </div>
        <IconButton variant="ghost" aria-label={t("common.refresh")} onClick={onRefresh}>
          <RefreshCw size={16} />
        </IconButton>
      </div>
    );
  }

  if (!current) return null;

  const score      = current.cyclingScore;
  const color      = scoreColor(score);
  const dashOffset = CIRC * (1 - score / 100);

  return (
    <div className="mx-4 overflow-hidden rounded-2xl bg-surface-2 shadow-card">

      <div className="flex items-center justify-between px-5 pt-3">
        <button
          type="button"
          onClick={onLocationClick}
          disabled={!onLocationClick}
          className="-ml-2 flex min-h-touch items-center gap-1 rounded-full px-2 disabled:cursor-default
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <MapPin size={12} className={isUsingGPS ? "text-primary" : "text-ink-3"} aria-hidden />
          <span className="text-caption font-bold uppercase tracking-wider text-ink-3">
            {t("weather.cycling_weather_place", { place })}
          </span>
        </button>

        <IconButton variant="ghost" aria-label={t("common.refresh")} onClick={onRefresh} disabled={isLoading} className="-mr-2">
          <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
        </IconButton>
      </div>

      <div className="flex items-center gap-5 px-5 pb-4 pt-2">

        {/* Score-ring */}
        <div className="relative flex-shrink-0" style={{ width: 96, height: 96 }}>
          <svg width={96} height={96} viewBox="0 0 120 120" aria-hidden="true">
            <circle cx={60} cy={60} r={R} fill="none" stroke="var(--color-surface-3)" strokeWidth={10} />
            <g transform="rotate(-90 60 60)">
              <motion.circle
                cx={60} cy={60} r={R}
                fill="none"
                stroke={color}
                strokeWidth={10}
                strokeLinecap="round"
                strokeDasharray={`${CIRC}`}
                initial={{ strokeDashoffset: CIRC }}
                animate={{ strokeDashoffset: dashOffset }}
                transition={{ duration: 1.1, ease: "easeOut" }}
              />
            </g>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              className="font-mono text-2xl font-bold leading-none"
              style={{ color }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {score}
            </motion.span>
            <span className="mt-0.5 font-mono text-[10px] font-semibold text-ink-3">/ 100</span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-1.5">
            <WeatherIcon code={current.weathercode} size={20} />
            <span className="truncate text-label font-medium text-ink-2">
              {t(`weather.condition_${weatherCondition(current.weathercode)}`)}
            </span>
          </div>
          <p className="mb-2.5 text-headline leading-tight text-ink">
            {t(`weather.cycling_${scoreBand(score)}`)}
          </p>
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 font-mono text-caption font-semibold text-ink-2">
            <span className="flex items-center gap-1">
              <Thermometer size={12} className="text-primary" aria-hidden />
              {Math.round(current.temperature)}°C
            </span>
            <span className="flex items-center gap-1">
              <Wind size={12} className="text-info" aria-hidden />
              {Math.round(current.windspeed)} km/h {t(`weather.dir_${windDirectionLabel(current.winddirection)}`)}
            </span>
            {current.precipitation > 0 && (
              <span className="flex items-center gap-1">
                <Droplets size={12} className="text-info" aria-hidden />
                {current.precipitation.toFixed(1)} mm
              </span>
            )}
          </div>
        </div>
      </div>

      <p className="px-5 pb-4 text-caption text-ink-3">
        {t(isUsingGPS ? "weather.footer_here" : "weather.footer_fallback")}
        {time && ` · ${t("weather.updated_at", { time })}`}
      </p>
    </div>
  );
}
