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
  locationLabel?:   string;   // "bij jouw locatie" / "in Lisse" / "in Hillegom"
  isUsingGPS?:      boolean;
  onLocationClick?: () => void; // Tik om locatiekaart opnieuw te openen
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
  // Titel op basis van locatiestatus
  const titleSuffix = locationLabel ?? "vandaag";
  const isFallback  = !isUsingGPS && (locationLabel === "in Lisse" || !locationLabel);

  // ── Skeleton ────────────────────────────────────────────────────────────────
  if (isLoading && !current) {
    return (
      <div className="mx-4 rounded-2xl bg-white shadow-card p-5 animate-pulse">
        <div className="flex items-center gap-5">
          <div className="w-24 h-24 rounded-full bg-gray-200 flex-shrink-0" />
          <div className="flex-1 space-y-2.5">
            <div className="h-3 bg-gray-200 rounded w-2/5" />
            <div className="h-5 bg-gray-200 rounded w-2/3" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
            <div className="flex gap-3 pt-1">
              <div className="h-3 bg-gray-200 rounded w-16" />
              <div className="h-3 bg-gray-200 rounded w-16" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Foutmelding ─────────────────────────────────────────────────────────────
  if (error && !current) {
    return (
      <div className="mx-4 rounded-2xl bg-red-50 border border-red-100 p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-red-700">
            Weerdata tijdelijk niet beschikbaar
          </p>
          <p className="text-xs text-red-400 mt-0.5">Controleer je verbinding</p>
        </div>
        <button
          onClick={onRefresh}
          className="p-2 rounded-full bg-red-100 text-red-500 hover:bg-red-200 transition-colors"
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
    <div className="mx-4 rounded-2xl bg-white shadow-card overflow-hidden">

      {/* Header-balk */}
      <div className="px-5 pt-4 flex items-center justify-between">
        {/* Klikbaar locatie-label */}
        <button
          onClick={onLocationClick}
          disabled={!onLocationClick}
          className="flex items-center gap-1 disabled:cursor-default group"
        >
          <MapPin
            size={11}
            className={`flex-shrink-0 ${isUsingGPS ? "text-[#E8527A]" : "text-gray-400"}`}
          />
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 group-hover:text-gray-600 transition-colors">
            Fietsweer {titleSuffix}
          </p>
        </button>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="p-1.5 -mr-1 rounded-full text-gray-400 hover:text-gray-600 disabled:opacity-40 transition-colors"
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
            {/* Achtergrond-ring */}
            <circle
              cx={60} cy={60} r={R}
              fill="none" stroke="#F3F4F6" strokeWidth={10}
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
          {/* Score-getal gecentreerd over de ring */}
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
            <span className="text-[9px] font-semibold text-gray-400 mt-0.5">/ 100</span>
          </div>
        </div>

        {/* Tekstinfo */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-2xl leading-none">{icon}</span>
            <span className="text-sm text-gray-600 font-medium truncate">{label}</span>
          </div>
          <p className="text-base font-extrabold text-gray-900 leading-tight mb-2.5">
            {current.cyclingLabel}
          </p>
          <div className="flex flex-wrap gap-x-3 gap-y-1.5">
            <span className="flex items-center gap-1 text-xs font-semibold text-gray-500">
              <Thermometer size={12} style={{ color: "#E8527A" }} />
              {Math.round(current.temperature)}°C
            </span>
            <span className="flex items-center gap-1 text-xs font-semibold text-gray-500">
              <Wind size={12} className="text-sky-400" />
              {Math.round(current.windspeed)} km/u {windDirectionLabel(current.winddirection)}
            </span>
            {current.precipitation > 0 && (
              <span className="flex items-center gap-1 text-xs font-semibold text-gray-500">
                <Droplets size={12} className="text-blue-400" />
                {current.precipitation.toFixed(1)} mm
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 pb-4">
        {isFallback ? (
          <p className="text-[10px] text-gray-400">
            Locatie onbekend · Gebaseerd op Lisse
            {lastUpdated && ` · ${formatTime(lastUpdated)}`}
          </p>
        ) : (
          <p className="text-[10px] text-gray-400">
            Vandaag in de Bollenstreek
            {lastUpdated && ` · Laatste update: ${formatTime(lastUpdated)}`}
          </p>
        )}
      </div>
    </div>
  );
}
