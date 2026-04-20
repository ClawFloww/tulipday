"use client";

// Grote weerskaart met geanimeerde fietsweer-score ring en locatie-indicatie

import { motion } from "framer-motion";
import { Wind, Thermometer, RefreshCw, Droplets, MapPin } from "lucide-react";
import type { CurrentWeather } from "@/lib/weather";
import {
  weatherIcon,
  weatherLabel,
  cyclingScoreColor,
  windDirectionLabel,
} from "@/lib/weather";

// SVG-ring parameters
const R    = 48;
const CIRC = 2 * Math.PI * R; // ≈ 301.6

interface Props {
  current:          CurrentWeather | null;
  isLoading:        boolean;
  error:            string | null;
  lastUpdated:      Date | null;
  onRefresh:        () => void;
  locationLabel?:   string;
  isUsingGPS?:      boolean;
  onLocationClick?: () => void;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
}

export default function WeatherCard({
  current,
  isLoading,
  error,
  lastUpdated,
  onRefresh,
  locationLabel,
  isUsingGPS = false,
  onLocationClick,
}: Props) {
  const titleSuffix = locationLabel ?? "vandaag";
  const isFallback  = !isUsingGPS && (locationLabel === "in Lisse" || !locationLabel);

  // ── Skeleton ──────────────────────────────────────────────────
  if (isLoading && !current) {
    return (
      <div className="mx-4 rounded-2xl bg-surface-2 shadow-card p-5">
        <div className="flex items-center gap-5">
          {/* Score-ring placeholder */}
          <div className="w-24 h-24 rounded-full skeleton-shimmer flex-shrink-0" />
          <div className="flex-1 space-y-2.5">
            <div className="h-3 skeleton-shimmer rounded w-2/5" />
            <div className="h-5 skeleton-shimmer rounded w-2/3" />
            <div className="h-3 skeleton-shimmer rounded w-1/2" />
            <div className="flex gap-3 pt-1">
              <div className="h-3 skeleton-shimmer rounded w-16" />
              <div className="h-3 skeleton-shimmer rounded w-16" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Foutmelding ───────────────────────────────────────────────
  if (error && !current) {
    return (
      <div className="mx-4 rounded-2xl bg-surface-2 border border-[var(--color-border)] p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
            Weerdata tijdelijk niet beschikbaar
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-3)" }}>
            Controleer je verbinding
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="p-2 rounded-full bg-surface-3 transition-colors tap-scale"
          style={{ color: "var(--color-text-2)" }}
        >
          <RefreshCw size={16} />
        </button>
      </div>
    );
  }

  if (!current) return null;

  const score      = current.cyclingScore;
  const color      = cyclingScoreColor(score);
  const dashOffset = CIRC * (1 - score / 100);
  const icon       = weatherIcon(current.weathercode);
  const label      = weatherLabel(current.weathercode);

  return (
    <div className="mx-4 rounded-2xl bg-surface-2 shadow-card overflow-hidden">

      {/* Header-balk */}
      <div className="px-5 pt-4 flex items-center justify-between">
        <button
          onClick={onLocationClick}
          disabled={!onLocationClick}
          className="flex items-center gap-1 disabled:cursor-default group"
        >
          <MapPin
            size={11}
            className="flex-shrink-0 transition-colors"
            style={{ color: isUsingGPS ? "var(--color-primary)" : "var(--color-text-3)" }}
          />
          <p className="text-[11px] font-bold uppercase tracking-wider transition-colors"
             style={{ color: "var(--color-text-3)" }}>
            Fietsweer {titleSuffix}
          </p>
        </button>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="p-1.5 -mr-1 rounded-full transition-colors disabled:opacity-40 tap-scale"
          style={{ color: "var(--color-text-3)" }}
          aria-label="Ververs weer"
        >
          <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Hoofd-inhoud */}
      <div className="px-5 py-4 flex items-center gap-5">

        {/* Score-ring */}
        <div className="relative flex-shrink-0" style={{ width: 96, height: 96 }}>
          <svg width={96} height={96} viewBox="0 0 120 120" aria-hidden="true">
            {/* Achtergrond-ring — past mee met thema */}
            <circle
              cx={60} cy={60} r={R}
              fill="none"
              stroke="var(--color-surface-3)"
              strokeWidth={10}
            />
            {/* Voortgangs-ring */}
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
          {/* Score-getal gecentreerd */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              className="text-2xl font-extrabold leading-none"
              style={{ color }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {score}
            </motion.span>
            <span className="text-[9px] font-semibold mt-0.5"
                  style={{ color: "var(--color-text-3)" }}>
              / 100
            </span>
          </div>
        </div>

        {/* Tekstinfo */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-2xl leading-none">{icon}</span>
            <span className="text-sm font-medium truncate"
                  style={{ color: "var(--color-text-2)" }}>
              {label}
            </span>
          </div>
          <p className="text-base font-extrabold leading-tight mb-2.5"
             style={{ color: "var(--color-text)" }}>
            {current.cyclingLabel}
          </p>
          <div className="flex flex-wrap gap-x-3 gap-y-1.5">
            <span className="flex items-center gap-1 text-xs font-semibold"
                  style={{ color: "var(--color-text-2)" }}>
              <Thermometer size={12} style={{ color: "var(--color-primary)" }} />
              {Math.round(current.temperature)}°C
            </span>
            <span className="flex items-center gap-1 text-xs font-semibold"
                  style={{ color: "var(--color-text-2)" }}>
              <Wind size={12} className="text-sky-400" />
              {Math.round(current.windspeed)} km/u {windDirectionLabel(current.winddirection)}
            </span>
            {current.precipitation > 0 && (
              <span className="flex items-center gap-1 text-xs font-semibold"
                    style={{ color: "var(--color-text-2)" }}>
                <Droplets size={12} className="text-blue-400" />
                {current.precipitation.toFixed(1)} mm
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 pb-4">
        <p className="text-[10px]" style={{ color: "var(--color-text-3)" }}>
          {isFallback
            ? `Locatie onbekend · Gebaseerd op Lisse${lastUpdated ? ` · ${formatTime(lastUpdated)}` : ""}`
            : `Vandaag in de Bollenstreek${lastUpdated ? ` · Laatste update: ${formatTime(lastUpdated)}` : ""}`
          }
        </p>
      </div>
    </div>
  );
}
